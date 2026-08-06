"""
Mentor Assignment Management Router.

Handles mentor availability, capacity calculations with month-rolling cooldowns,
and creation/updating of mentor-student assignments for administrators.
"""

import calendar
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_admin
from app.db.database import get_db
from app.models.enums import AssignmentStatusEnum
from app.models.mentor import Mentor
from app.models.mentor_assignment import MentorAssignment
from app.schemas.mentor_assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStatusUpdate,
    AssignmentWithIntakeResponse,
    MentorCapacity,
)

from app.core.email import send_email
import logging


router = APIRouter(prefix="/mentor-assignments", tags=["mentor-assignments"])


# ------------------------------------------------------------------------------
# Helper Utilities
# ------------------------------------------------------------------------------

def _add_one_month(dt: datetime) -> datetime:
    """
    Add exactly one calendar month to a datetime object.

    Handles edge cases for shorter target months (e.g., Jan 31 -> Feb 28/29)
    by clamping the target day to the last valid day of that month.
    """
    year = dt.year + (dt.month // 12)
    month = dt.month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _compute_cooldown_state(
    event_dates: List[datetime], capacity: int, now: datetime
) -> Tuple[int, Optional[datetime]]:
    """
    Calculate a mentor's current capacity window and active cooldown status.
    """
    window_count = 0
    cooldown_until: Optional[datetime] = None

    if capacity <= 0:
        return 0, None

    for dt in event_dates:
        if cooldown_until is not None:
            if dt < cooldown_until:
                continue
            window_count = 0
            cooldown_until = None

        window_count += 1
        if window_count >= capacity:
            cooldown_until = _add_one_month(dt)

    if cooldown_until is not None and now >= cooldown_until:
        return 0, None

    return window_count, cooldown_until


async def _capacity_for(db: AsyncSession, mentor: Mentor) -> MentorCapacity:
    """
    Construct a MentorCapacity schema object for a given mentor.
    """
    target_id = mentor.user_id

    # Exclude both 'cancelled' AND 'declined' from capacity/cooldown counting
    rows = (
        await db.execute(
            select(
                MentorAssignment.assigned_at, MentorAssignment.status
            ).where(
                MentorAssignment.mentor_id == target_id,
                MentorAssignment.status.notin_([
                    AssignmentStatusEnum.cancelled,
                    AssignmentStatusEnum.declined,
                ]),
            ).order_by(MentorAssignment.assigned_at.asc())
        )
    ).all()

    has_active = any(r.status == AssignmentStatusEnum.active for r in rows)

    assigned_dates = [
        r.assigned_at.replace(tzinfo=None)
        for r in rows
        if r.assigned_at is not None
    ]

    capacity = mentor.max_monthly_sessions or 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    window_count, cooldown_until = _compute_cooldown_state(
        assigned_dates, capacity, now
    )
    at_capacity = cooldown_until is not None

    return MentorCapacity(
        mentor_user_id=mentor.user_id,
        full_name=(
            mentor.user.full_name
            if (mentor.user and hasattr(mentor.user, "full_name"))
            else "Unknown Mentor"
        ),
        capacity=capacity,
        assigned_count=window_count,
        available_capacity=0 if at_capacity else max(capacity - window_count, 0),
        cooldown_until=cooldown_until,
        has_active_assignment=has_active,
        at_capacity=at_capacity,
        eligible=bool(mentor.is_available and not has_active and not at_capacity),
    )


async def assert_mentor_assignable(db: AsyncSession, mentor_id: int) -> Mentor:
    """
    Validate whether a mentor exists and is available for a new assignment.
    """
    stmt = (
        select(Mentor)
        .options(selectinload(Mentor.user))
        .where(Mentor.user_id == mentor_id)
    )
    res = await db.execute(stmt)
    mentor = res.scalars().first()

    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor not found",
        )
    if not mentor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mentor is not available",
        )

    cap = await _capacity_for(db, mentor)
    if cap.has_active_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mentor already has an active assignment",
        )
    if cap.at_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mentor is on cooldown until {cap.cooldown_until.date()}",
        )
    return mentor


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/capacity",
    response_model=List[MentorCapacity],
    summary="List capacity metrics for all mentors",
)
async def list_mentor_capacity(db: AsyncSession = Depends(get_db)):
    """
    Retrieve capacity, active status, and eligibility info for all mentors.
    Full Path: GET /mentor-assignments/capacity
    """
    stmt = select(Mentor).options(selectinload(Mentor.user))
    mentors = (await db.execute(stmt)).scalars().all()
    return [await _capacity_for(db, m) for m in mentors]


@router.get(
    "/recommendations",
    response_model=List[MentorCapacity],
    summary="Get eligible mentors for new assignments",
)
async def get_mentor_recommendations(db: AsyncSession = Depends(get_db)):
    """
    Filter and rank available mentors eligible for receiving a new student.
    Full Path: GET /mentor-assignments/recommendations
    """
    stmt = (
        select(Mentor)
        .options(selectinload(Mentor.user))
        .where(Mentor.is_available == True)
    )
    mentors = (await db.execute(stmt)).scalars().all()

    capacities = [await _capacity_for(db, m) for m in mentors]
    eligible = [c for c in capacities if c.eligible]
    eligible.sort(key=lambda c: c.available_capacity, reverse=True)
    return eligible


@router.get(
    "",
    response_model=List[AssignmentWithIntakeResponse],
    summary="List all mentor assignments",
)
@router.get(
    "/",
    response_model=List[AssignmentWithIntakeResponse],
    include_in_schema=False,
)
async def list_all_assignments(
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    """
    Retrieve all mentor assignments with student, mentor, and intake form details.
    Full Path: GET /mentor-assignments
    """
    from app.models.student import Student
    from sqlalchemy import desc
    stmt = (
        select(MentorAssignment)
        .options(
            selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
            selectinload(MentorAssignment.student).selectinload(Student.user),
            selectinload(MentorAssignment.intake_form),
        )
        .order_by(desc(MentorAssignment.assigned_at))
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post(
    "",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new mentor-student assignment",
)
@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_assignment(
    form: AssignmentCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a mentor to a student (admin override — bypasses capacity/availability gates).
    Full Path: POST /mentor-assignments
    """
    from app.models.student import Student
    from app.models.student_intake_form import StudentIntakeForm
    from app.models.user import User
    from app.models.enums import IntakeFormStatusEnum
    from sqlalchemy.exc import IntegrityError

    admin_user_id = int(current_user["sub"])

    # Verify admin user exists
    admin_user = await db.get(User, admin_user_id)
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Admin user account with ID {admin_user_id} not found."
        )

    # Verify mentor exists
    mentor_res = await db.execute(
        select(Mentor).options(selectinload(Mentor.user)).where(Mentor.user_id == form.mentor_id)
    )
    mentor = mentor_res.scalars().first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found")

    # Verify intake form exists
    intake_form = await db.get(StudentIntakeForm, form.intake_form_id)
    if not intake_form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intake form with ID {form.intake_form_id} not found"
        )

    # Resolve effective student_id
    effective_student_id = form.student_id or intake_form.student_id

    if not effective_student_id:
        if intake_form.email:
            user_res = await db.execute(select(User).where(User.email == intake_form.email))
            user = user_res.scalars().first()
            if user:
                effective_student_id = user.id
                intake_form.student_id = user.id

    if not effective_student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake form is missing student identification."
        )

    # Verify student exists
    student_res = await db.execute(select(Student).where(Student.user_id == effective_student_id))
    student_obj = student_res.scalars().first()
    if not student_obj:
        # Create student profile if User exists
        user_res = await db.execute(select(User).where(User.id == effective_student_id))
        user_obj = user_res.scalars().first()
        if user_obj:
            student_obj = Student(
                user_id=user_obj.id,
                major=intake_form.major,
            )
            db.add(student_obj)
            await db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student profile with ID {effective_student_id} not found"
            )

    # Cancel ALL active/pending assignments for this student across any intake form.
    existing_stmt = select(MentorAssignment).where(
        MentorAssignment.student_id == effective_student_id,
        or_(
            MentorAssignment.status == AssignmentStatusEnum.pending,
            MentorAssignment.status == AssignmentStatusEnum.active,
        ),
    )
    existing_res = await db.execute(existing_stmt)
    for prev in existing_res.scalars().all():
        if prev.status == AssignmentStatusEnum.active:
            # Restore displaced mentor's availability
            displaced_mentor = await db.get(Mentor, prev.mentor_id)
            if displaced_mentor:
                displaced_mentor.is_available = True
        prev.status = AssignmentStatusEnum.cancelled

    assignment = MentorAssignment(
        mentor_id=mentor.user_id,
        student_id=effective_student_id,
        intake_form_id=form.intake_form_id,
        assigned_by=admin_user_id,
        status=AssignmentStatusEnum.pending,
    )
    db.add(assignment)

    # Mark the new mentor unavailable (will be finalised when they accept)
    mentor.is_available = False

    # Update intake form status to assigned
    intake_form.status = IntakeFormStatusEnum.assigned

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database constraint error: {str(e.orig) if hasattr(e, 'orig') else str(e)}"
        )

    mentor_email = mentor.user.email if mentor.user else None
    student_name = student_obj.full_name if hasattr(student_obj, 'full_name') else "A student"


    if mentor_email:
        try:
            await send_email(
                subject="New Mentorship Assignment",
                recipient=mentor_email,
                body=f"""
                <p>Assalamu Alaikum,</p>
                <p>You have been assigned a new student: <strong>{student_name}</strong>.</p>
                <p>Please log in to your dashboard to review and accept or decline the assignment.</p>
                <br>
                <p>Jazakum Allahu Khayran,</p>
                <p>The Ummah Professionals Team</p>
                """
            )
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send assignment email to mentor: {e}")

    stmt = (
        select(MentorAssignment)
        .options(
            selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
            selectinload(MentorAssignment.student).selectinload(Student.user),
            selectinload(MentorAssignment.intake_form),
        )
        .where(MentorAssignment.id == assignment.id)
    )
    res = await db.execute(stmt)
    return res.scalars().one()


@router.patch(
    "/{assignment_id}/status",
    response_model=AssignmentResponse,
    summary="Update assignment status",
)
async def update_assignment_status(
    assignment_id: int,
    form: AssignmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    """
    Update status of an assignment (e.g. active, completed, cancelled).
    Full Path: PATCH /mentor-assignments/{assignment_id}/status
    """
    from app.models.student_intake_form import StudentIntakeForm
    from app.models.enums import IntakeFormStatusEnum

    assignment = await db.get(MentorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    assignment.status = form.status
    if form.status == AssignmentStatusEnum.completed:
        assignment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # If cancelled or declined, reset intake form status back to submitted for re-matching
    if form.status in [AssignmentStatusEnum.cancelled, AssignmentStatusEnum.declined]:
        intake_form = await db.get(StudentIntakeForm, assignment.intake_form_id)
        if intake_form:
            intake_form.status = IntakeFormStatusEnum.submitted

    await db.commit()

    stmt = (
        select(MentorAssignment)
        .options(
            selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
            selectinload(MentorAssignment.student).selectinload(Student.user),
            selectinload(MentorAssignment.intake_form),
        )
        .where(MentorAssignment.id == assignment.id)
    )
    res = await db.execute(stmt)
    return res.scalars().one()


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mentor assignment",
)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    """
    Delete an assignment and reset intake form status back to submitted.
    Full Path: DELETE /mentor-assignments/{assignment_id}
    """
    from app.models.student_intake_form import StudentIntakeForm
    from app.models.enums import IntakeFormStatusEnum

    assignment = await db.get(MentorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    intake_form = await db.get(StudentIntakeForm, assignment.intake_form_id)
    if intake_form:
        intake_form.status = IntakeFormStatusEnum.submitted

    await db.delete(assignment)
    await db.commit()
    return None