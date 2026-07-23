from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db

from app.models.mentor_recommendation import (
    MentorRecommendation,
    RecommendationStatus,
)

from app.models.user import User
from app.models.student import Student
from app.models.mentor import Mentor


router = APIRouter(
    prefix="/admin/recommendations",
    tags=["Admin Recommendations"]
)


@router.get("/")
async def get_recommendations(
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(MentorRecommendation)
        .order_by(
            MentorRecommendation.score.desc()
        )
    )

    recommendations = result.scalars().all()


    response = []


    for rec in recommendations:

        student = await db.get(
            Student,
            rec.student_user_id
        )

        mentor = await db.get(
            Mentor,
            rec.mentor_user_id
        )


        student_user = await db.get(
            User,
            rec.student_user_id
        )

        mentor_user = await db.get(
            User,
            rec.mentor_user_id
        )


        response.append(
            {
                "recommendation_id": rec.id,

                "student": {
                    "id": student.user_id,
                    "name": student_user.full_name,
                    "major": student.major,
                },

                "mentor": {
                    "id": mentor.user_id,
                    "name": mentor_user.full_name,
                    "job_title": mentor.job_title,
                    "industry": mentor.industry,
                },

                "score": rec.score,

                "status": rec.status,

                "created_at": rec.created_at
            }
        )


    return response