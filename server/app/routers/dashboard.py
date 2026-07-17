#Routes the user to their respective dashboard
from fastapi import APIRouter, Depends, HTTPException
from app.models.enums import RoleEnum
from app.core.deps import get_current_user
from app.core.deps import require_admin, require_mentor, require_student

router = APIRouter()
print("DASHBOARD ROUTER LOADED")


#Student dashboard get:
@router.get("/student")
async def student_dashboard(user=Depends(require_student)):

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized") #If 

    if user["role"] != RoleEnum.student.value:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {"dashboard": "student"}


#Mentor dashboard get:
@router.get("/mentor")
async def mentor_dashboard(user=Depends(require_mentor)):

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if user["role"] != RoleEnum.mentor.value:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {"dashboard": "mentor"}


#Admin dashboard get: 
@router.get("/admin")
async def admin_dashboard(user=Depends(require_admin)):

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if user["role"] != RoleEnum.admin.value:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {"dashboard": "admin"}