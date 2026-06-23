from app.models.enums import UserType

MOCK_USERS = [
    {
        "id": 1,
        "email": "admin@test.com",
        "password": "admin123",
        "role": UserType.ADMIN
    },
    {
        "id": 2,
        "email": "mentor@test.com",
        "password": "mentor123",
        "role": UserType.MENTOR
    },
    {
        "id": 3,
        "email": "student@test.com",
        "password": "student123",
        "role": UserType.STUDENT
    }
]