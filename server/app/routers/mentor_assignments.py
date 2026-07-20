from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.mentor_assignment import MentorAssignment
from app.models.student import Student
from app.models.user import User
from app.models.enums import AssignmentStatusEnum, IntakeFormStatusEnum
from app.schemas.mentor_assignment import AssignmentWithIntakeResponse
from app.models.mentor import Mentor
from app.models.student_intake_form import StudentIntakeForm
from app.core.deps import require_mentor

router = APIRouter()



@router.get("/mentors/requests", response_model=list[AssignmentWithIntakeResponse])
async def get_mentor_requests(
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    result = await db.execute(
        select(MentorAssignment)
        .where(MentorAssignment.mentor_id == mentor_id)
        .options(
            selectinload(MentorAssignment.student).selectinload(Student.user),
            selectinload(MentorAssignment.intake_form),
            selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
        )
        .order_by(MentorAssignment.assigned_at.desc())
    )
    assignments = result.scalars().all()
    return assignments


@router.patch("/mentors/requests/{assignment_id}/accept")
async def accept_request(
    assignment_id: int,
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    result = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.id == assignment_id,
            MentorAssignment.mentor_id == mentor_id,
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.status != AssignmentStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Assignment is not pending")

    assignment.status = AssignmentStatusEnum.active

    
    # Mark mentor as unavailable
    mentor_result = await db.execute(
        select(Mentor).where(Mentor.user_id == mentor_id)
    )
    mentor = mentor_result.scalar_one_or_none()
    if mentor:
        mentor.is_available = False


    await db.commit()
    await db.refresh(assignment)
    return {"message": "Assignment accepted", "status": assignment.status}


@router.patch("/mentors/requests/{assignment_id}/decline")
async def decline_request(
    assignment_id: int,
    user=Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    result = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.id == assignment_id,
            MentorAssignment.mentor_id == mentor_id,
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.status != AssignmentStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Assignment is not pending")

    assignment.status = AssignmentStatusEnum.declined

    # Put intake form back to submitted so admin can reassign
    intake_result = await db.execute(
        select(StudentIntakeForm).where(StudentIntakeForm.id == assignment.intake_form_id)
    )
    intake_form = intake_result.scalar_one_or_none()
    if intake_form:
        intake_form.status = IntakeFormStatusEnum.submitted

    # Mark mentor as available again
    mentor_result = await db.execute(
        select(Mentor).where(Mentor.user_id == mentor_id)
    )
    mentor = mentor_result.scalar_one_or_none()
    if mentor:
        mentor.is_available = True

    await db.commit()
    await db.refresh(assignment)
    return {"message": "Assignment declined", "status": assignment.status}