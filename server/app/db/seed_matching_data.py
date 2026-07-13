from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.tag import Tag
from app.models.student_tag import StudentTag
from app.models.mentor_tag import MentorTag

SKILLS = [
    "Python",
    "SQL",
    "AWS",
    "React",
    "Machine Learning",
    "Excel",
]

STUDENT_SKILLS = {
    4: ["Python", "SQL"],
    5: ["Excel"],
}

MENTOR_SKILLS = {
    2: ["Python", "SQL", "AWS"],
    3: ["Excel", "React"],
}


async def seed():

    async with AsyncSessionLocal() as db:

        tag_lookup = {}

        for skill in SKILLS:

            result = await db.execute(
                select(Tag).where(Tag.name == skill)
            )

            tag = result.scalar_one_or_none()

            if tag is None:
                tag = Tag(
                    name=skill,
                    category="skill"
                )
                db.add(tag)
                await db.flush()

            tag_lookup[skill] = tag.id

        for student_id, skills in STUDENT_SKILLS.items():

            for skill in skills:

                exists = await db.get(
                    StudentTag,
                    (student_id, tag_lookup[skill])
                )

                if exists is None:
                    db.add(
                        StudentTag(
                            student_user_id=student_id,
                            tag_id=tag_lookup[skill]
                        )
                    )

        for mentor_id, skills in MENTOR_SKILLS.items():

            for skill in skills:

                exists = await db.get(
                    MentorTag,
                    (mentor_id, tag_lookup[skill])
                )

                if exists is None:
                    db.add(
                        MentorTag(
                            mentor_user_id=mentor_id,
                            tag_id=tag_lookup[skill]
                        )
                    )

        await db.commit()


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())