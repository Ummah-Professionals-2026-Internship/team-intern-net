# Getting users to test the JWT workflow by seeding the database
import asyncio

from passlib.context import CryptContext
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.models.enums import RoleEnum, GenderEnum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

users = [
    {
        "email": "admin01@gmail.com",
        "full_name": "Administrator",
        "password": "admin123",
        "role": RoleEnum.admin,
        "gender": GenderEnum.m,
    },
    {
        "email": "mentor01@gmail.com",
        "full_name": "Mentor 01",
        "password": "mentor123",
        "role": RoleEnum.mentor,
        "gender": GenderEnum.m,
    },
    {
        "email": "mentor02@gmail.com",
        "full_name": "Mentor 02",
        "password": "mentor123",
        "role": RoleEnum.mentor,
        "gender": GenderEnum.f,
    },
    {
        "email": "student01@gmail.com",
        "full_name": "Student 01",
        "password": "student123",
        "role": RoleEnum.student,
        "gender": GenderEnum.m,
    },
    {
        "email": "student02@gmail.com",
        "full_name": "Student 02",
        "password": "student123",
        "role": RoleEnum.student,
        "gender": GenderEnum.f,
    },
]

#This is the seed function that adds to db and hashes passwords
async def seed_users():
    async with AsyncSessionLocal() as session:

        for u in users:
            # Skip if the user already exists
            result = await session.execute(
                select(User).where(User.email == u["email"])
            )

            if result.scalar_one_or_none():
                print(f"Skipping {u['email']} (already exists)")
                continue

            user = User(
                email=u["email"],
                full_name=u["full_name"],
                password_hash=pwd_context.hash(u["password"]),
                role=u["role"],
                gender=u["gender"],
                is_active=True,
            )

            session.add(user)
            print(f"Added {u['email']}")

        await session.commit()

    print("Done seeding users.")


if __name__ == "__main__":
    asyncio.run(seed_users())