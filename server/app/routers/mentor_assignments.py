"""
Mentor assignment + capacity tracking.

Capacity counts ASSIGNMENTS, not meetings -- this matches the ticket's AC
literally: "current assigned applicant count tracked", "capacity updates
when assignments are created/removed". A slot is used the moment a mentor
accepts a student (MentorAssignment created), not when a meeting happens.
Cancelling an assignment releases its slot automatically, since cancelled
assignments are excluded from the live count.

MentorAssignment allows only ONE active assignment per mentor at a time
(partial unique index). That's tracked separately as has_active_assignment
-- it still gates new assignments (the DB would reject a 2nd active one
regardless of capacity headroom), but it no longer conflates with the
numeric counter the way an earlier meeting-based version of this did.

Cooldown rule: the counter does NOT reset on the calendar month. The
moment a mentor's Nth assignment (max_monthly_sessions) is accepted, they
go on cooldown until exactly one month after THAT assignment's
assigned_at date -- e.g. accepting a 2nd student on the 31st puts them on
cooldown through next month's 1st, not two days later. Computed by
replaying assignment dates in order, not a single COUNT, since it depends
on dates relative to each other.

NOTE: assigned_by should come from the authenticated admin's user id.
There's no auth dependency wired up yet (main.py's login is demo-only),
so it's taken as a plain field on the request for now -- swap the
admin_user_id param for a real `current_admin: User = Depends(...)` once
auth exists.
"""
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
    """dt + 1 calendar month, clamping the day for shorter months
    (e.g. Jan 31 -> Feb 28/29)."""
    year = dt.year + (dt.month // 12)
    month = dt.month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _compute_cooldown_state(
    event_dates: List[datetime], capacity: int, now: datetime
) -> Tuple[int, Optional[datetime]]:
    """event_dates must be sorted ascending -- assignment assigned_at
    dates for non-cancelled assignments. Returns
    (assigned_count_in_current_cycle, cooldown_until | None)."""
    window_count = 0
    cooldown_until: Optional[datetime] = None

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
    rows = (await db.execute(
        select(MentorAssignment.assigned_at, MentorAssignment.status).where(
            MentorAssignment.mentor_id == mentor.user_id,
            MentorAssignment.status != AssignmentStatusEnum.cancelled,
        ).order_by(MentorAssignment.assigned_at.asc())
    )).all()

    has_active = any(r.status == AssignmentStatusEnum.active for r in rows)
    assigned_dates = [r.assigned_at for r in rows]

    capacity = mentor.max_monthly_sessions
    now = datetime.now(timezone.utc)
    window_count, cooldown_until = _compute_cooldown_state(assigned_dates, capacity, now)
    at_capacity = cooldown_until is not None

    return MentorCapacity(
        mentor_user_id=mentor.user_id,
        full_name=mentor.user.full_name,
        capacity=capacity,
        assigned_count=window_count,
        available_capacity=0 if at_capacity else max(capacity - window_count, 0),
        cooldown_until=cooldown_until,
        has_active_assignment=has_active,
        at_capacity=at_capacity,
        eligible=mentor.is_available and not has_active and not at_capacity,
    )


async def assert_mentor_assignable(db: AsyncSession, mentor_id: int) -> Mentor:
    mentor = await db.get(Mentor, mentor_id, options=[selectinload(Mentor.user)])
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
    """Mentors eligible for a NEW assignment: available, no active
    assignment, not on cooldown. Most available capacity first."""
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
    await assert_mentor_assignable(db, form.mentor_id)

    assignment = MentorAssignment(
        mentor_id=form.mentor_id,
        student_id=form.student_id,
        intake_form_id=form.intake_form_id,
        assigned_by=admin_user_id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment, attribute_names=["mentor", "student"])
    return assignment


@router.patch("/assignments/{assignment_id}/status", response_model=AssignmentResponse)
async def update_assignment_status(
    assignment_id: int,
    form: AssignmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Cancelling an assignment releases its capacity slot immediately
    (live count excludes cancelled rows). Completing one keeps the slot
    counted for this cycle -- it was genuinely used."""
    assignment = await db.get(MentorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    assignment.status = form.status
    if form.status == AssignmentStatusEnum.completed:
        assignment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.refresh(assignment, attribute_names=["mentor", "student"])
    return assignment