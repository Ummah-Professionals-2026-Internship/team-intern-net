from fastapi import APIRouter

from app.matching import rank_mentors


router = APIRouter(
    prefix="/matching",
    tags=["Matching"]
)

@router.get("/demo")
async def demo_matching():

    student = {

        "gender":"female",
        "major":"Computer Science",
        "desired_career":"Machine Learning",

        "tags":[
            "Python",
            "Machine Learning",
            "Healthcare"
        ]

    }


    mentors = [

        {
            "id":101,
            "name":"Sarah",
            "gender":"female",
            "major":"Computer Science",
            "industry":"Healthcare AI",
            "tags":[
                "Python",
                "Machine Learning"
            ]
        },


        {
            "id":102,
            "name":"Ahmed",
            "gender":"male",
            "major":"Business",
            "industry":"Finance",
            "tags":[
                "Marketing"
            ]
        }

    ]


    return rank_mentors(
        student,
        mentors
    )