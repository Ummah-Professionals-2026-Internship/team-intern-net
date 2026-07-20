from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.database import get_db
from app.models.availability_slot import AvailabilitySlot
from app.schemas.availability_slot import (
    AvailabilitySlotBulkCreate,
    AvailabilitySlotBulkResponse,
    AvailabilitySlotResponse,
)
from datetime import datetime, timezone
from app.core.deps import require_mentor


router = APIRouter()



@router.post("/mentors/availability")
async def set_availability(
    body: AvailabilitySlotBulkCreate,
    user=Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    if not body.slots:
        raise HTTPException(status_code=400, detail="No slots provided")
    
     # Check for duplicates within the submitted slots themselves
    for i, slot in enumerate(body.slots):
        for j, other in enumerate(body.slots):
            if i != j and slot.start_datetime < other.end_datetime and slot.end_datetime > other.start_datetime:
                raise HTTPException(status_code=400, detail="Submitted slots overlap with each other")


    date = body.slots[0].start_datetime.date()

    existing = await db.execute(
        select(AvailabilitySlot).where(
                AvailabilitySlot.mentor_id == mentor_id,
                AvailabilitySlot.is_booked == False
                )
    )
    for slot in existing.scalars().all():
        if slot.start_datetime.date() == date:
            await db.delete(slot)

    new_slots = [
        AvailabilitySlot(
            mentor_id=mentor_id,
            start_datetime=s.start_datetime,
            end_datetime=s.end_datetime,
        )
        for s in body.slots
    ]
    db.add_all(new_slots)
    await db.commit()
    for slot in new_slots:
        await db.refresh(slot)

    return AvailabilitySlotBulkResponse(created=len(new_slots), slots=new_slots)


@router.get("/mentors/availability", response_model=list[AvailabilitySlotResponse])
async def get_availability(
    month: int,
    year: int,
    user=Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    # last day of month
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.mentor_id == mentor_id,
               AvailabilitySlot.start_datetime >= start,
               AvailabilitySlot.start_datetime < end,
        )
        .order_by(AvailabilitySlot.start_datetime)
    )
    return result.scalars().all()


@router.delete("/mentors/availability/{slot_id}")
async def delete_slot(
    slot_id: int,
    user=Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.id == slot_id,
            AvailabilitySlot.mentor_id == mentor_id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot")

    await db.delete(slot)
    await db.commit()
    return {"message": "Slot deleted successfully"}