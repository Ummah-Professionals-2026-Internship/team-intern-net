from fastapi import APIRouter, Depends
from app.models.enums import UserType #Already has user type from enums
from app.core.deps import get_current_user

router = APIRouter()
print("DASHBOARD ROUTER LOADED")

#Creating routing to the pages (student, mentor, admin):
@router.get("/student")
async def student_dashboard(user=Depends(get_current_user)):
    if user["role"] != UserType.STUDENT.value:
        return {"error":"Forbidden"}
    
    return {"dashboard":"student"}

@router.get("/mentor")
async def mentor_dashboard(user=Depends(get_current_user)):
    if user["role"] != UserType.MENTOR.value:
        return {"error":"Forbidden"}
    
    return {"dashboard":"mentor"}

@router.get("/admin")
async def admin_dashboard(user=Depends(get_current_user)):
    if user["role"] != UserType.ADMIN.value:
        return {"error":"Forbidden"}
    
    return {"dashboard":"admin"}