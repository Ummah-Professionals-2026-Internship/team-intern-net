import calendar
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.enums import AssignmentStatusEnum
from app.models.mentor import Mentor
from app.models.mentor_assignment import MentorAssignment
from app.schemas.mentor_assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStatusUpdate,
    MentorCapacity,
)

router = APIRouter()


def _add_one_month(dt: datetime) -> datetime:
    """dt + 1 calendar month, clamping the day for shorter months."""
    year = dt.year + (dt.month // 12)
    month = dt.month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _compute_cooldown_state(
    event_dates: List[datetime], capacity: int, now: datetime
) -> Tuple[int, Optional[datetime]]:
    """(assigned_count_in_current_cycle, cooldown_until | None)."""
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
    # Query assignments by Mentor.user_id OR Mentor.id consistently.
    # Assuming MentorAssignment.mentor_id points to Mentor.user_id:
    target_id = mentor.user_id if hasattr(mentor, "user_id") and mentor.user_id else mentor.id

    rows = (await db.execute(
        select(MentorAssignment.assigned_at, MentorAssignment.status).where(
            MentorAssignment.mentor_id == target_id,
            MentorAssignment.status != AssignmentStatusEnum.cancelled,
        ).order_by(MentorAssignment.assigned_at.asc())
    )).all()

    has_active = any(r.status == AssignmentStatusEnum.active for r in rows)

    # Safely handle null/missing assigned_at timestamps
    assigned_dates = [
        r.assigned_at.replace(tzinfo=None)
        for r in rows
        if r.assigned_at is not None
    ]

    capacity = mentor.max_monthly_sessions or 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    window_count, cooldown_until = _compute_cooldown_state(assigned_dates, capacity, now)
    at_capacity = cooldown_until is not None

    return MentorCapacity(
        mentor_user_id=mentor.user_id if hasattr(mentor, "user_id") else mentor.id,
        full_name=mentor.user.full_name if (mentor.user and hasattr(mentor.user, "full_name")) else "Unknown Mentor",
        capacity=capacity,
        assigned_count=window_count,
        available_capacity=0 if at_capacity else max(capacity - window_count, 0),
        cooldown_until=cooldown_until,
        has_active_assignment=has_active,
        at_capacity=at_capacity,
        eligible=bool(mentor.is_available and not has_active and not at_capacity),
    )


async def assert_mentor_assignable(db: AsyncSession, mentor_id: int) -> Mentor:
    # Look up mentor by primary key or user_id gracefully
    stmt = select(Mentor).options(selectinload(Mentor.user)).where(
        (Mentor.id == mentor_id) | (Mentor.user_id == mentor_id)
    )
    res = await db.execute(stmt)
    mentor = res.scalars().first()

    if not mentor:
        raise HTTPException(404, "Mentor not found")
    if not mentor.is_available:
        raise HTTPException(400, "Mentor is not available")

    cap = await _capacity_for(db, mentor)
    if cap.has_active_assignment:
        raise HTTPException(400, "Mentor already has an active assignment")
    if cap.at_capacity:
        raise HTTPException(400, f"Mentor is on cooldown until {cap.cooldown_until.date()}")
    return mentor


@router.get("/mentors/capacity", response_model=List[MentorCapacity])
async def list_mentor_capacity(db: AsyncSession = Depends(get_db)):
    """All mentors with capacity info -- feeds the admin dashboard."""
    mentors = (await db.execute(select(Mentor).options(selectinload(Mentor.user)))).scalars().all()
    return [await _capacity_for(db, m) for m in mentors]


@router.get("/mentors/recommendations", response_model=List[MentorCapacity])
async def get_mentor_recommendations(db: AsyncSession = Depends(get_db)):
    """Mentors eligible for a NEW assignment."""
    mentors = (await db.execute(
        select(Mentor).options(selectinload(Mentor.user)).where(Mentor.is_available == True)
    )).scalars().all()
    
    capacities = [await _capacity_for(db, m) for m in mentors]
    eligible = [c for c in capacities if c.eligible]
    eligible.sort(key=lambda c: c.available_capacity, reverse=True)
    return eligible


@router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(
    form: AssignmentCreate,
    admin_user_id: int,  # TODO: replace with Depends(current_admin) once auth exists
    db: AsyncSession = Depends(get_db),
):
    mentor = await assert_mentor_assignable(db, form.mentor_id)

    assignment = MentorAssignment(
        mentor_id=mentor.user_id if hasattr(mentor, "user_id") and mentor.user_id else mentor.id,
        student_id=form.student_id,
        intake_form_id=form.intake_form_id,
        assigned_by=admin_user_id,
    )
    db.add(assignment)
    await db.commit()
    
    # Re-query with explicit options to avoid Async MissingGreenlet serialization crashes
    stmt = (
        select(MentorAssignment)
        .options(selectinload(MentorAssignment.mentor), selectinload(MentorAssignment.student))
        .where(MentorAssignment.id == assignment.id)
    )
    res = await db.execute(stmt)
    return res.scalars().one()


@router.patch("/assignments/{assignment_id}/status", response_model=AssignmentResponse)
async def update_assignment_status(
    assignment_id: int,
    form: AssignmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    assignment = await db.get(MentorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    assignment.status = form.status
    if form.status == AssignmentStatusEnum.completed:
        assignment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    
    stmt = (
        select(MentorAssignment)
        .options(selectinload(MentorAssignment.mentor), selectinload(MentorAssignment.student))
        .where(MentorAssignment.id == assignment.id)
    )
    res = await db.execute(stmt)
    return res.scalars().one()