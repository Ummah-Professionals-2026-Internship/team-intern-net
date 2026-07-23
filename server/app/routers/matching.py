from fastapi import APIRouter, Depends

from app.core.matching import recommend_mentors
from app.db.database import get_db


router = APIRouter(
    prefix="/matching",
    tags=["Matching"]
)



@router.get("/{student_id}")
async def generate_matches(
    student_id:int,
    db=Depends(get_db)
):

    return await recommend_mentors(
        db,
        student_id
    )