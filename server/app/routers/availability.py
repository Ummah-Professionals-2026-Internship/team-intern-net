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

router = APIRouter()

# TODO: replace with real auth dependency once auth is set up
def get_current_mentor_id() -> int:
    return 3 # hardcoded for now

@router.post("/mentors/availability")
async def set_availability(
    body: AvailabilitySlotBulkCreate,
    mentor_id: int = Depends(get_current_mentor_id),
    db: AsyncSession = Depends(get_db),
):
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
    mentor_id: int = Depends(get_current_mentor_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.mentor_id == mentor_id)
        .order_by(AvailabilitySlot.start_datetime)
    )
    return result.scalars().all()


@router.delete("/mentors/availability/{slot_id}")
async def delete_slot(
    slot_id: int,
    mentor_id: int = Depends(get_current_mentor_id),
    db: AsyncSession = Depends(get_db),
):
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