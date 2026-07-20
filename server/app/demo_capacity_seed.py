"""
Seeds demo data to showcase capacity states in the admin dashboard.
Builds the full FK chain from scratch -- safe to run against a genuinely
empty database.

Capacity counts ASSIGNMENTS, not meetings (see routers/mentor_assignments.py
for why) -- so this seed no longer needs Meeting/AvailabilitySlot rows at
all to demonstrate every state.

States demoed:
  - Amina: 0 assignments                               -> 0/2, Available
  - Omar:  1 active assignment (accepted, not closed)  -> 1/2, Booked
  - Layla: 2 completed assignments, accepted on June 30 and July 1 --
           the OLD calendar-month logic would have wrongly reset her count
           on the 1st. The fixed rolling-cooldown logic correctly keeps
           her on cooldown through Aug 1 (one month after the 2nd).
  - Aisha & Zainab: Unassigned pending student intake applications to 
           populate the Recent Applicants queue on the dashboard.

Usage:
    python -m app.demo_capacity_seed            # tears down any prior demo
                                                # data, then seeds fresh
    python -m app.demo_capacity_seed --teardown  # just removes demo data,
                                                # doesn't reseed
"""
import asyncio
import sys
from datetime import datetime, timezone

import bcrypt
from sqlalchemy import delete, select

from app.db.database import AsyncSessionLocal
from app.models.enums import (
    AssignmentStatusEnum,
    EducationLevelEnum,
    GenderEnum,
    IntakeFormStatusEnum,
    RoleEnum,
    ServiceTypeEnum,
)
from app.models.meeting import Meeting
from app.models.mentor import Mentor
from app.models.mentor_assignment import MentorAssignment
from app.models.student import Student
from app.models.student_intake_form import StudentIntakeForm
from app.models.user import User

DEMO_EMAILS = [
    "admin@demo.com",
    "amina@demo.com",
    "omar@demo.com",
    "layla@demo.com",
    "fatima@demo.com",
    "huda@demo.com",
    "sara@demo.com",
    "aisha@demo.com",
    "zainab@demo.com",
]


def _pwd():
    # Direct bcrypt call, not passlib -- this is throwaway demo-user data,
    # nobody logs in as these accounts, so we don't need passlib's
    # multi-scheme/deprecation machinery here. Works on any bcrypt version.
    return bcrypt.hashpw(b"demo-password", bcrypt.gensalt()).decode()


async def _make_student(db, full_name: str, email: str) -> Student:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=_pwd(),
        role=RoleEnum.student,
    )
    db.add(user)
    await db.flush()
    student = Student(
        user_id=user.id,
        major="Computer Science",
        education_level=EducationLevelEnum.undergraduate,
    )
    db.add(student)
    await db.flush()
    return student


async def _make_intake_form(
    db, 
    student: Student, 
    full_name: str, 
    email: str, 
    status: IntakeFormStatusEnum = IntakeFormStatusEnum.assigned
) -> StudentIntakeForm:
    form = StudentIntakeForm(
        student_id=student.user_id,
        full_name=full_name,
        email=email,
        service_type=ServiceTypeEnum.mentorship_program,
        gender=GenderEnum.f,
        desired_career="Software Engineer",
        major="Computer Science",
        status=status,
    )
    db.add(form)
    await db.flush()
    return form


async def teardown():
    async with AsyncSessionLocal() as db:
        demo_ids = (
            await db.scalars(
                select(User.id).where(User.email.in_(DEMO_EMAILS))
            )
        ).all()
        if not demo_ids:
            print("No demo data found -- nothing to remove")
            return

        # Meeting rows may exist from an older version of this seed script
        # (or from real usage) -- must go before assignments, since
        # meetings.assignment_id is ondelete=RESTRICT.
        await db.execute(
            delete(Meeting).where(
                Meeting.assignment_id.in_(
                    select(MentorAssignment.id).where(
                        MentorAssignment.mentor_id.in_(demo_ids)
                        | MentorAssignment.student_id.in_(demo_ids)
                    )
                )
            )
        )
        await db.execute(
            delete(MentorAssignment).where(
                MentorAssignment.mentor_id.in_(demo_ids)
                | MentorAssignment.student_id.in_(demo_ids)
                | MentorAssignment.assigned_by.in_(demo_ids)
            )
        )
        await db.execute(
            delete(StudentIntakeForm).where(
                StudentIntakeForm.student_id.in_(demo_ids)
            )
        )
        await db.execute(
            delete(User).where(User.id.in_(demo_ids))
        )  # cascades Mentor/Student
        await db.commit()
        print(
            f"Removed demo data ({len(demo_ids)} users and everything attached to them)"
        )


async def seed():
    await teardown()  # safe to re-run: clears any prior demo data first

    async with AsyncSessionLocal() as db:
        admin = User(
            full_name="Demo Admin",
            email="admin@demo.com",
            password_hash=_pwd(),
            role=RoleEnum.admin,
        )
        db.add(admin)
        await db.flush()

        # --- Amina: 0 assignments -> Available ---
        u1 = User(
            full_name="Amina Yusuf",
            email="amina@demo.com",
            password_hash=_pwd(),
            role=RoleEnum.mentor,
        )
        db.add(u1)
        await db.flush()
        db.add(
            Mentor(
                user_id=u1.id,
                max_monthly_sessions=2,
                is_available=True,
                industry="Software Engineering",
            )
        )

        # --- Omar: 1 active assignment -> 1/2, Booked ---
        u2 = User(
            full_name="Omar Siddiqui",
            email="omar@demo.com",
            password_hash=_pwd(),
            role=RoleEnum.mentor,
        )
        db.add(u2)
        await db.flush()
        db.add(
            Mentor(
                user_id=u2.id,
                max_monthly_sessions=2,
                is_available=True,
                industry="Data Science",
            )
        )
        await db.flush()

        student_a = await _make_student(db, "Fatima Noor", "fatima@demo.com")
        form_a = await _make_intake_form(
            db, student_a, "Fatima Noor", "fatima@demo.com", status=IntakeFormStatusEnum.assigned
        )
        db.add(
            MentorAssignment(
                mentor_id=u2.id,
                student_id=student_a.user_id,
                intake_form_id=form_a.id,
                assigned_by=admin.id,
                status=AssignmentStatusEnum.active,
            )
        )

        # --- Layla: 2 completed assignments crossing a month boundary -> 2/2, Cooldown ---
        u3 = User(
            full_name="Layla Haddad",
            email="layla@demo.com",
            password_hash=_pwd(),
            role=RoleEnum.mentor,
        )
        db.add(u3)
        await db.flush()
        db.add(
            Mentor(
                user_id=u3.id,
                max_monthly_sessions=2,
                is_available=True,
                industry="Product Management",
            )
        )
        await db.flush()

        student_b = await _make_student(db, "Huda Rahman", "huda@demo.com")
        form_b = await _make_intake_form(
            db, student_b, "Huda Rahman", "huda@demo.com", status=IntakeFormStatusEnum.assigned
        )
        db.add(
            MentorAssignment(
                mentor_id=u3.id,
                student_id=student_b.user_id,
                intake_form_id=form_b.id,
                assigned_by=admin.id,
                status=AssignmentStatusEnum.completed,
                assigned_at=datetime(2026, 6, 30, tzinfo=timezone.utc),
                completed_at=datetime(2026, 6, 30),
            )
        )

        student_c = await _make_student(db, "Sara Malik", "sara@demo.com")
        form_c = await _make_intake_form(
            db, student_c, "Sara Malik", "sara@demo.com", status=IntakeFormStatusEnum.assigned
        )
        db.add(
            MentorAssignment(
                mentor_id=u3.id,
                student_id=student_c.user_id,
                intake_form_id=form_c.id,
                assigned_by=admin.id,
                status=AssignmentStatusEnum.completed,
                assigned_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
                completed_at=datetime(2026, 7, 1),
            )
        )

        # --- Submitted Applicants (Populates Recent Applicants queue) ---
        student_d = await _make_student(db, "Aisha Ali", "aisha@demo.com")
        await _make_intake_form(
            db, student_d, "Aisha Ali", "aisha@demo.com", status=IntakeFormStatusEnum.submitted
        )

        student_e = await _make_student(db, "Zainab Ahmed", "zainab@demo.com")
        await _make_intake_form(
            db, student_e, "Zainab Ahmed", "zainab@demo.com", status=IntakeFormStatusEnum.submitted
        )

        await db.commit()
        print(
            "Seeded: Amina (0/2 Available), Omar (1/2 Booked), "
            "Layla (2/2 Cooldown until Aug 1, 2026 -- 2nd assignment accepted July 1), "
            "and 2 Submitted Applicants (Aisha Ali, Zainab Ahmed)."
        )


if __name__ == "__main__":
    if "--teardown" in sys.argv:
        asyncio.run(teardown())
    else:
        asyncio.run(seed())