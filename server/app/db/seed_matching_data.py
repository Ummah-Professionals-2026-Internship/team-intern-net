"""
seed_matching_data.py

Seeds demo data for mentor matching:

- Users
- Students
- Mentors
- Student Intake Forms
- Mentor Applications
- Tags
- Student Tags
- Mentor Tags

Run:

python -m app.db.seed_matching_data
"""

import asyncio

from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.core.security import hash_password

from app.models.user import User
from app.models.student import Student
from app.models.mentor import Mentor
from app.models.student_intake_form import StudentIntakeForm
from app.models.mentor_application import MentorApplication
from app.models.tag import Tag
from app.models.student_tag import StudentTag
from app.models.mentor_tag import MentorTag

from app.models.enums import (
    RoleEnum,
    GenderEnum,
    EducationLevelEnum,
    AcademicStandingEnum,
    ServiceTypeEnum,
    ApplicationStatusEnum,
    IntakeFormStatusEnum,
)


from app.db.seed_tag_data import (
    load_skills,
    load_majors,
    CAREERS,
    INDUSTRIES,
    SERVICES,
)

# --------------------------------------------------
# CREATE TAGS
# --------------------------------------------------

async def seed_tags(db):
    """
    Loads all tag groups (major, career, industry, skill, service),
    inserts any tag name not already in the database, and returns a
    name -> id lookup for every tag currently in the database.

    Duplicate-safe:
      - Checks against existing DB rows before inserting.
      - Also tracks names added *within this run* so the same name
        appearing twice (e.g. once from a hardcoded list and once
        from a loaded file, or repeated across categories) is only
        inserted once.
    """

    existing = await db.execute(
        select(Tag)
    )

    existing_tags = {
        tag.name
        for tag in existing.scalars().all()
    }

    new_tags = []

    tag_groups = {
        "major": load_majors(),
        "career": CAREERS,
        "industry": INDUSTRIES,
        "skill": load_skills(),
        "service": SERVICES,
    }

    for category, values in tag_groups.items():

        for value in values:

            if not value:
                continue

            if value in existing_tags:
                continue

            new_tags.append(
                Tag(
                    name=value,
                    category=category
                )
            )

            # Mark as seen immediately so a name repeated later in
            # this same loop (same or different category) doesn't
            # get queued for insertion a second time.
            existing_tags.add(value)

    if new_tags:
        db.add_all(new_tags)
        await db.flush()

    result = await db.execute(
        select(Tag)
    )

    return {
        tag.name: tag.id
        for tag in result.scalars().all()
    }


def _build_tag_records(tag_data, tag_lookup, model, id_field, missing_tags):
    """
    Generic, KeyError-safe builder for StudentTag / MentorTag rows.

    Any demo tag name that isn't present in tag_lookup (e.g. a name
    used in the demo data that doesn't exist in the loaded skills /
    majors files) is skipped instead of raising, and recorded in
    missing_tags for a single summary warning at the end of the run.
    """

    records = []

    for user_id, tag_names in tag_data.items():

        for tag_name in tag_names:

            tag_id = tag_lookup.get(tag_name)

            if tag_id is None:
                missing_tags.add(tag_name)
                continue

            records.append(
                model(**{
                    id_field: user_id,
                    "tag_id": tag_id,
                })
            )

    return records



# --------------------------------------------------
# MAIN SEED FUNCTION
# --------------------------------------------------

async def seed():

    async with AsyncSessionLocal() as db:


        # ------------------------------------------
        # USERS
        # ------------------------------------------

        users = []


        admin = User(
            email="admin@test.com",
            full_name="Admin",
            password_hash=hash_password("admin123"),
            role=RoleEnum.admin,
            gender=GenderEnum.m,
        )

        users.append(admin)


        mentor_users = []

        for i in range(1,8):

            mentor = User(
                email=f"mentor{i}@test.com",
                full_name=f"Mentor {i}",
                password_hash=hash_password("pass"),
                role=RoleEnum.mentor,
                gender=(
                    GenderEnum.m
                    if i % 2
                    else GenderEnum.f
                ),
            )

            mentor_users.append(mentor)
            users.append(mentor)



        student_users = []


        for i in range(1,4):

            student = User(
                email=f"student{i}@test.com",
                full_name=f"Student {i}",
                password_hash=hash_password("pass"),
                role=RoleEnum.student,
                gender=(
                    GenderEnum.m
                    if i != 2
                    else GenderEnum.f
                ),
            )

            student_users.append(student)
            users.append(student)



        db.add_all(users)

        await db.flush()



        # ------------------------------------------
        # STUDENTS
        # ------------------------------------------

        student_records = [

            Student(
                user_id=student_users[0].id,
                major="Computer Science",
                education_level=EducationLevelEnum.undergraduate,
                academic_standing=AcademicStandingEnum.junior,
            ),

            Student(
                user_id=student_users[1].id,
                major="Finance",
                education_level=EducationLevelEnum.undergraduate,
                academic_standing=AcademicStandingEnum.senior,
            ),

            Student(
                user_id=student_users[2].id,
                major="Biology",
                education_level=EducationLevelEnum.graduate,
                academic_standing=None,
            ),
        ]


        db.add_all(student_records)

        await db.flush()



        # ------------------------------------------
        # MENTORS
        # ------------------------------------------

        mentor_records = [

            Mentor(
                user_id=mentor_users[0].id,
                gender=GenderEnum.m,
                employer="Tech Corp",
                job_title="Software Engineer",
                industry="Technology",
                service_types=[
                    ServiceTypeEnum.mock_interview
                ],
            ),

            Mentor(
                user_id=mentor_users[1].id,
                gender=GenderEnum.f,
                employer="AI Labs",
                job_title="Data Scientist",
                industry="Technology",
                service_types=[
                    ServiceTypeEnum.career_advice
                ],
            ),

            Mentor(
                user_id=mentor_users[2].id,
                gender=GenderEnum.m,
                employer="Finance Group",
                job_title="Financial Analyst",
                industry="Finance",
                service_types=[
                    ServiceTypeEnum.career_advice
                ],
            ),


            Mentor(
                user_id=mentor_users[3].id,
                gender=GenderEnum.f,
                employer="Hospital",
                job_title="Doctor",
                industry="Healthcare",
                service_types=[
                    ServiceTypeEnum.mentorship_program
                ],
            ),


            Mentor(
                user_id=mentor_users[4].id,
                gender=GenderEnum.m,
                employer="Software Company",
                job_title="Backend Engineer",
                industry="Technology",
                service_types=[
                    ServiceTypeEnum.mock_interview
                ],
            ),


            Mentor(
                user_id=mentor_users[5].id,
                gender=GenderEnum.f,
                employer="Investment Firm",
                job_title="Investment Banker",
                industry="Finance",
                service_types=[
                    ServiceTypeEnum.career_advice
                ],
            ),


            Mentor(
                user_id=mentor_users[6].id,
                gender=GenderEnum.m,
                employer="Security Company",
                job_title="Cybersecurity Analyst",
                industry="Technology",
                service_types=[
                    ServiceTypeEnum.mock_interview
                ],
            ),
        ]


        db.add_all(mentor_records)

        await db.flush()

        # ------------------------------------------ p2
        # STUDENT INTAKE FORMS
        # ------------------------------------------

        intake_forms = [

            StudentIntakeForm(
                student_id=student_users[0].id,
                phone="555-111-1111",
                service_type=ServiceTypeEnum.career_advice,
                gender=GenderEnum.m,
                major="Computer Science",
                desired_career="Software Engineer",
                comments="Interested in backend engineering and AI.",
                status=IntakeFormStatusEnum.submitted,
            ),


            StudentIntakeForm(
                student_id=student_users[1].id,
                phone="555-222-2222",
                service_type=ServiceTypeEnum.mock_interview,
                gender=GenderEnum.f,
                major="Finance",
                desired_career="Financial Analyst",
                comments="Needs help preparing for finance interviews.",
                status=IntakeFormStatusEnum.submitted,
            ),


            StudentIntakeForm(
                student_id=student_users[2].id,
                phone="555-333-3333",
                service_type=ServiceTypeEnum.career_advice,
                gender=GenderEnum.m,
                major="Biology",
                desired_career="Research Scientist",
                comments="Interested in healthcare research careers.",
                status=IntakeFormStatusEnum.submitted,
            ),
        ]


        db.add_all(intake_forms)

        await db.flush()



        # ------------------------------------------
        # MENTOR APPLICATIONS
        # ------------------------------------------

        mentor_applications = [

            MentorApplication(
                full_name="Mentor 1",
                email="mentor1@test.com",
                employer="Tech Corp",
                phone_number="555-444-1111",
                gender=GenderEnum.m,
                job_title="Software Engineer",
                industry="Technology",
                experience="Backend engineering experience.",
                linkedin_url="https://linkedin.com/in/mentor1",
                major="Computer Science",
                alma_mater="Rutgers University",
                county="Middlesex",
                state="NJ",
                other_info="Interested in helping software students.",
                service_types=[
                    ServiceTypeEnum.mock_interview
                ],
                status=ApplicationStatusEnum.approved,
                created_user_id=mentor_users[0].id,
            ),


            MentorApplication(
                full_name="Mentor 2",
                email="mentor2@test.com",
                employer="AI Labs",
                phone_number="555-444-2222",
                gender=GenderEnum.f,
                job_title="Data Scientist",
                industry="Technology",
                experience="Machine learning and analytics background.",
                linkedin_url="https://linkedin.com/in/mentor2",
                major="Data Science",
                alma_mater="MIT",
                county="Essex",
                state="NJ",
                other_info="Interested in AI mentorship.",
                service_types=[
                    ServiceTypeEnum.career_advice
                ],
                status=ApplicationStatusEnum.approved,
                created_user_id=mentor_users[1].id,
            ),


            MentorApplication(
                full_name="Mentor 3",
                email="mentor3@test.com",
                employer="Finance Group",
                phone_number="555-444-3333",
                gender=GenderEnum.m,
                job_title="Financial Analyst",
                industry="Finance",
                experience="Corporate finance experience.",
                linkedin_url="https://linkedin.com/in/mentor3",
                major="Finance",
                alma_mater="Rutgers University",
                county="Union",
                state="NJ",
                other_info="Finance career mentoring.",
                service_types=[
                    ServiceTypeEnum.career_advice
                ],
                status=ApplicationStatusEnum.approved,
                created_user_id=mentor_users[2].id,
            ),


            MentorApplication(
                full_name="Mentor 4",
                email="mentor4@test.com",
                employer="Medical Center",
                phone_number="555-444-4444",
                gender=GenderEnum.f,
                job_title="Doctor",
                industry="Healthcare",
                experience="Healthcare professional.",
                linkedin_url="https://linkedin.com/in/mentor4",
                major="Biology",
                alma_mater="Medical School",
                county="Hudson",
                state="NJ",
                other_info="Healthcare mentorship.",
                service_types=[
                    ServiceTypeEnum.mentorship_program
                ],
                status=ApplicationStatusEnum.approved,
                created_user_id=mentor_users[3].id,
            ),
        ]


        db.add_all(mentor_applications)

        await db.flush()



        # ------------------------------------------
        # TAGS
        # ------------------------------------------

        tag_lookup = await seed_tags(db)

        # Collects any demo tag names that don't exist in tag_lookup
        # (e.g. not present in the loaded skills/majors files or the
        # hardcoded career/industry/service lists) so we can warn
        # about them once instead of crashing with a KeyError.
        missing_tags = set()



        # ------------------------------------------
        # STUDENT TAGS
        # ------------------------------------------

        student_tag_data = {


            student_users[0].id: [
                "Computer Science",
                "Python",
                "Machine Learning",
                "Software Engineer",
                "Technology",
            ],


            student_users[1].id: [
                "Finance",
                "Financial Analyst",
                "SQL",
                "Communication",
            ],


            student_users[2].id: [
                "Biology",
                "Healthcare",
                "Research Scientist",
                "Research",
            ],
        }


        student_tags = _build_tag_records(
            student_tag_data,
            tag_lookup,
            StudentTag,
            "student_user_id",
            missing_tags,
        )


        db.add_all(student_tags)



        # ------------------------------------------
        # MENTOR TAGS
        # ------------------------------------------

        mentor_tag_data = {


            mentor_users[0].id: [
                "Python",
                "AWS",
                "Software Engineer",
                "Technology",
            ],


            mentor_users[1].id: [
                "Python",
                "Machine Learning",
                "Data Scientist",
                "Artificial Intelligence",
            ],


            mentor_users[2].id: [
                "Finance",
                "Financial Analyst",
                "SQL",
            ],


            mentor_users[3].id: [
                "Healthcare",
                "Doctor",
                "Research Scientist",
                "Biology",
            ],


            mentor_users[4].id: [
                "Backend Engineer",
                "FastAPI",
                "PostgreSQL",
                "Python",
            ],


            mentor_users[5].id: [
                "Finance",
                "Investment Banker",
                "Leadership",
            ],


            mentor_users[6].id: [
                "Cybersecurity Analyst",
                "Cybersecurity",
                "Linux",
                "Networking",
            ],
        }


        mentor_tags = _build_tag_records(
            mentor_tag_data,
            tag_lookup,
            MentorTag,
            "mentor_user_id",
            missing_tags,
        )


        db.add_all(mentor_tags)


        if missing_tags:
            print(
                "Warning: skipped demo tag(s) not found in the tag "
                f"table: {sorted(missing_tags)}"
            )



        # ------------------------------------------
        # SAVE
        # ------------------------------------------

        await db.commit()

        print("Matching demo seed complete.")



if __name__ == "__main__":
    asyncio.run(seed())