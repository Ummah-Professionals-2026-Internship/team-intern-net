from sqlalchemy import select, delete

from app.models.student import Student
from app.models.mentor import Mentor
from app.models.user import User

from app.models.tag import Tag
from app.models.student_tag import StudentTag
from app.models.mentor_tag import MentorTag

from app.models.mentor_recommendation import MentorRecommendation


# -----------------------------
# MATCHING WEIGHTS
# -----------------------------

GENDER_SCORE = 10
MAJOR_SCORE = 20
CAREER_SCORE = 20
INDUSTRY_SCORE = 15
SKILL_SCORE = 5
SERVICE_SCORE = 5
CAPACITY_SCORE = 5



async def get_tags(db, model, user_id):

    """
    Generic tag loader.

    model:
        StudentTag or MentorTag

    Returns:
        List[Tag]
    """

    result = await db.execute(
        select(Tag)
        .join(model, model.tag_id == Tag.id)
        .where(
            model.student_user_id == user_id
            if model == StudentTag
            else model.mentor_user_id == user_id
        )
    )

    return result.scalars().all()



async def recommend_mentors(db, student_user_id: int):


    # -----------------------------
    # STUDENT
    # -----------------------------

    student = await db.get(
        Student,
        student_user_id
    )

    student_user = await db.get(
        User,
        student_user_id
    )


    if not student or not student_user:
        return []


    student_tags = await get_tags(
        db,
        StudentTag,
        student_user_id
    )


    student_tag_map = {
        category: {
            tag.name
            for tag in student_tags
            if tag.category == category
        }

        for category in [
            "major",
            "career",
            "industry",
            "skill",
            "service",
        ]
    }



    # -----------------------------
    # MENTORS
    # -----------------------------

    mentors = (
        await db.execute(
            select(Mentor)
        )
    ).scalars().all()



    recommendations = []



    for mentor in mentors:


        mentor_tags = await get_tags(
            db,
            MentorTag,
            mentor.user_id
        )


        mentor_tag_map = {
            category: {
                tag.name
                for tag in mentor_tags
                if tag.category == category
            }

            for category in [
                "major",
                "career",
                "industry",
                "skill",
                "service",
            ]
        }



        score = 0



        # -----------------------------
        # Gender
        # -----------------------------

        if student_user.gender == mentor.gender:
            score += GENDER_SCORE



        # -----------------------------
        # Major Match
        # -----------------------------

        if (
            student_tag_map["major"]
            &
            mentor_tag_map["major"]
        ):
            score += MAJOR_SCORE



        # -----------------------------
        # Career Match
        # -----------------------------

        if (
            student_tag_map["career"]
            &
            mentor_tag_map["career"]
        ):
            score += CAREER_SCORE



        # -----------------------------
        # Industry Match
        # -----------------------------

        if (
            student_tag_map["industry"]
            &
            mentor_tag_map["industry"]
        ):
            score += INDUSTRY_SCORE



        # -----------------------------
        # Skill Overlap
        # -----------------------------

        score += (
            len(
                student_tag_map["skill"]
                &
                mentor_tag_map["skill"]
            )
            *
            SKILL_SCORE
        )



        # -----------------------------
        # Service Compatibility
        # -----------------------------

        if (
            student_tag_map["service"]
            &
            mentor_tag_map["service"]
        ):
            score += SERVICE_SCORE



        # -----------------------------
        # Availability
        # -----------------------------

        if mentor.is_available:
            score += CAPACITY_SCORE



        recommendations.append(
            {
                "student_user_id": student_user_id,
                "mentor_user_id": mentor.user_id,
                "score": score,
            }
        )



    # Highest score first

    recommendations.sort(
        key=lambda x: x["score"],
        reverse=True
    )



    # -----------------------------
    # SAVE RESULTS
    # -----------------------------

    # Remove old recommendations

    await db.execute(
        delete(MentorRecommendation)
        .where(
            MentorRecommendation.student_user_id
            ==
            student_user_id
        )
    )



    # Save top 5

    for recommendation in recommendations[:5]:

        db.add(
            MentorRecommendation(
                student_user_id=
                recommendation["student_user_id"],

                mentor_user_id=
                recommendation["mentor_user_id"],

                score=
                recommendation["score"],

                status="pending"
            )
        )



    await db.commit()



    return recommendations[:5]