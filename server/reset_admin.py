import asyncio
import sys
import os

# Ensure app package is importable when executed directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.models.enums import RoleEnum
from app.core.security import hash_password


async def reset_admin_password(email: str, new_password: str):
    if len(new_password) < 6:
        print("❌ Error: Password must be at least 6 characters long.")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ Error: User with email '{email}' not found.")
            return

        if user.role != RoleEnum.admin:
            print(f"⚠️ Warning: User '{email}' has role '{user.role.value}', not 'admin'.")

        user.password_hash = hash_password(new_password)
        await db.commit()
        print(f"✅ Success: Password for '{email}' ({user.role.value}) has been updated successfully.")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_admin.py <email> <new_password>")
        sys.exit(1)

    email_arg = sys.argv[1].strip()
    pass_arg = sys.argv[2]
    asyncio.run(reset_admin_password(email_arg, pass_arg))
