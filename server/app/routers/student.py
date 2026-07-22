from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.deps import require_student
from app.models.user import User
from app.models.student import Student
from app.models.student_intake_form import StudentIntakeForm
from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.availability_slot import AvailabilitySlot
from app.models.mentor import Mentor
try:
    from app.models.enums import ServiceTypeEnum
except ImportError:
    ServiceTypeEnum = None
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/student", tags=["student"])

class StudentProfileUpdate(BaseModel):
    full_name: str
    school: Optional[str] = ""
    major: Optional[str] = ""
    graduation_year: Optional[str] = ""
    academic_level: Optional[str] = ""
    industry: Optional[str] = ""
    desired_career: Optional[str] = ""
    comments: Optional[str] = ""
    service_requested: Optional[str] = ""

SERVICE_MAP_TO_FRONTEND = {
    "career_advice": "Career Advice",
    "resume_review": "Resume Review",
    "mock_interview": "Mock Interview"
}

SERVICE_MAP_TO_BACKEND = {
    "career advice": "career_advice",
    "resume review": "resume_review",
    "mock interview": "mock_interview"
}

@router.get("/profile")
async def get_student_profile(
    current_user: dict = Depends(require_student), 
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])
    
    # 1. Fetch User Object
    user_res = await db.execute(select(User).where(User.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Fetch Student Profile Object
    student_res = await db.execute(select(Student).where(Student.user_id == user_id))
    student_obj = student_res.scalar_one_or_none()

    # 3. Fetch Intake Form Metrics
    intake_obj = None
    if student_obj:
        student_identifier = getattr(student_obj, "id", student_obj.user_id)
        intake_res = await db.execute(
            select(StudentIntakeForm)
            .where((StudentIntakeForm.student_id == student_identifier) | (StudentIntakeForm.student_id == user_id))
            .order_by(StudentIntakeForm.id.desc())
        )
        intake_obj = intake_res.scalars().first()

    # 4. Check for active Match/Assignment in the database
    assignment_res = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.student_id == user_id,
            MentorAssignment.status == "active"
        )
    )
    assignment = assignment_res.scalar_one_or_none()

    # 5. Populate the mentor data profile details if assigned
    mentor_payload = None
    if assignment:
        mentor_user_res = await db.execute(select(User).where(User.id == assignment.mentor_id))
        mentor_user = mentor_user_res.scalar_one_or_none()
        
        mentor_profile_res = await db.execute(select(Mentor).where(Mentor.user_id == assignment.mentor_id))
        mentor_profile = mentor_profile_res.scalar_one_or_none()

        if mentor_user:
            mentor_payload = {
                "id": assignment.mentor_id,
                "name": mentor_user.full_name,
                "job_title": getattr(mentor_profile, "job_title", "Industry Professional"),
                "employer": getattr(mentor_profile, "company", getattr(mentor_profile, "employer", "Expert Group")),
                "industry": getattr(mentor_profile, "industry", "Technology")
            }

    # Formatting metadata variations safely
    raw_level = getattr(student_obj, "academic_standing", "")
    formatted_level = raw_level.value.title() if hasattr(raw_level, "value") else str(raw_level).title()

    raw_service = getattr(intake_obj, "service_type", "")
    service_str = str(raw_service.value) if hasattr(raw_service, "value") else str(raw_service)
    if "." in service_str:
        service_str = service_str.split(".")[-1]
    service_str = service_str.lower().strip()

    ui_service = SERVICE_MAP_TO_FRONTEND.get(service_str, service_str.replace("_", " ").title())
    if not ui_service or ui_service == "None":
        ui_service = "Career Advice"

    saved_industry = getattr(intake_obj, "major", "Technology")
    if hasattr(saved_industry, "value"):
        saved_industry = saved_industry.value
    if "." in str(saved_industry):
        saved_industry = str(saved_industry).split(".")[-1]
    saved_industry = str(saved_industry).replace("_", " ").title()

    return {
        "full_name": user_obj.full_name,
        "email": user_obj.email,
        "school": getattr(student_obj, "school", ""),
        "major": getattr(student_obj, "major", ""),
        "graduation_year": getattr(student_obj, "graduation_year", ""),
        "academic_level": formatted_level if formatted_level and formatted_level != "None" else "Senior",
        "industry": saved_industry if saved_industry and saved_industry != "None" else "Technology", 
        "desired_career": getattr(intake_obj, "desired_career", "") or "Software Engineer",
        "service_requested": ui_service,
        "comments": getattr(intake_obj, "comments", ""),
        # This will hydrate the React client state variable and advance the stepper
        "mentor": mentor_payload
    }

@router.put("/profile/update")
async def update_student_profile(
    payload: StudentProfileUpdate,
    current_user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])
    
    user_res = await db.execute(select(User).where(User.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    user_obj.full_name = payload.full_name
    db.add(user_obj)

    student_res = await db.execute(select(Student).where(Student.user_id == user_id))
    student_obj = student_res.scalar_one_or_none()
    if not student_obj:
        student_obj = Student(user_id=user_id)
    
    setattr(student_obj, 'major', payload.major)
    if hasattr(student_obj, 'school'): setattr(student_obj, 'school', payload.school)
    if hasattr(student_obj, 'graduation_year'): setattr(student_obj, 'graduation_year', payload.graduation_year)
    
    if hasattr(student_obj, 'academic_standing') and payload.academic_level:
        setattr(student_obj, 'academic_standing', payload.academic_level.lower().strip())
    db.add(student_obj)
    await db.flush()

    student_identifier = getattr(student_obj, "id", student_obj.user_id)
    intake_res = await db.execute(
        select(StudentIntakeForm)
        .where((StudentIntakeForm.student_id == student_identifier) | (StudentIntakeForm.student_id == user_id))
        .order_by(StudentIntakeForm.id.desc())
    )
    intake_obj = intake_res.scalars().first()
    
    if not intake_obj:
        intake_obj = StudentIntakeForm(
            student_id=student_identifier,
            full_name=payload.full_name,
            email=user_obj.email
        )
    
    intake_obj.desired_career = payload.desired_career
    intake_obj.comments = payload.comments
        
    if payload.service_requested:
        ui_input = payload.service_requested.lower().strip()
        db_enum_val = SERVICE_MAP_TO_BACKEND.get(ui_input, ui_input.replace(" ", "_"))
        
        if ServiceTypeEnum and hasattr(ServiceTypeEnum, db_enum_val):
            intake_obj.service_type = getattr(ServiceTypeEnum, db_enum_val)
        else:
            intake_obj.service_type = db_enum_val
        
    if payload.industry and hasattr(intake_obj, 'major'):
        intake_obj.major = payload.industry

    db.add(intake_obj)
    await db.commit()
    
    return {"message": "Profile saved successfully"}

@router.get("/meetings")
async def get_student_meetings(
    current_user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])

    assignment_res = await db.execute(
        select(MentorAssignment).where(MentorAssignment.student_id == user_id)
    )
    assignment = assignment_res.scalar_one_or_none()
    if not assignment:
        return []

    meetings_res = await db.execute(
        select(Meeting).where(Meeting.assignment_id == assignment.id)
        .order_by(Meeting.start_datetime.desc())
    )
    meetings = meetings_res.scalars().all()

    mentor_res = await db.execute(
        select(User).where(User.id == assignment.mentor_id)
    )
    mentor_user = mentor_res.scalar_one_or_none()

    result = []
    for meeting in meetings:
        result.append({
            "id": meeting.id,
            "mentor_name": mentor_user.full_name if mentor_user else "Your Mentor",
            "start_datetime": meeting.start_datetime.isoformat(),
            "end_datetime": meeting.end_datetime.isoformat(),
            "status": meeting.status.value,
            "meeting_url": meeting.meeting_url,
        })

    return result

@router.get("/status")
async def get_student_status(
    current_user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])

    assignment_res = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.student_id == user_id,
            MentorAssignment.status == "active"
        )
    )
    assignment = assignment_res.scalar_one_or_none()

    meeting = None
    if assignment:
        meeting_res = await db.execute(
            select(Meeting).where(Meeting.assignment_id == assignment.id)
        )
        meeting = meeting_res.scalars().first()

    if meeting:
        step = "completed"
    elif assignment:
        step = "schedule_meeting"
    else:
        step = "finding_match"

    return {
        "step": step,
        "has_assignment": assignment is not None,
        "mentor_id": assignment.mentor_id if assignment else None
    }