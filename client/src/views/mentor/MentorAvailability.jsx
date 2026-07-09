import { useState, useMemo, useEffect } from "react";
import "./MentorAvailability.css";
import TrashIcon from "../../assets/icons/trash.svg";

const DAYS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatTime(utcDatetime) {
  if (!utcDatetime) return "";
  return new Date(utcDatetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: userTimezone,
  });
}

function toUTCDatetime(dateKey, timeValue) {
  return new Date(`${dateKey}T${timeValue}`).toISOString();
}

// function formatTime(value) {
//   if (!value) return "";
//   const [h, m] = value.split(":").map(Number);
//   const period = h >= 12 ? "PM" : "AM";
//   const hour = h % 12 || 12;
//   return `${hour}:${String(m).padStart(2, "0")} ${period}`;
// }

export default function MentorAvailability() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Slot being added
  const [newSlot, setNewSlot] = useState({ start: "", end: "" });
  const [slotError, setSlotError] = useState("");
  
  
  useEffect(() => {
    const fetchAvailability = async () => {
        setLoading(true);
      
        try {
            const response = await fetch(`http://localhost:8000/mentors/availability?month=${viewMonth + 1}&year=${viewYear}`);
            const data = await response.json();
            
            // Group slots by date key
            const grouped = {};
            data.forEach((slot) => {
                const dateKey = slot.start_datetime.split("T")[0];
                
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push({
                    id: slot.id,
                    start: slot.start_datetime,
                    end: slot.end_datetime,
                    is_booked: slot.is_booked,
                });

            });
            setAvailability(grouped);

      } catch (err) {
            console.log(err)    
            console.error("Failed to fetch availability");
      } finally {
            setLoading(false);
        }

    };
  
    fetchAvailability();
    }, [viewMonth, viewYear]);

  // Calendar grid
  const { calendarDays, firstDayOfWeek } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return {
      calendarDays: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      firstDayOfWeek: firstDay,
    };
  }, [viewYear, viewMonth]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
        setSelectedDate(null);
        setNewSlot({ start: "", end: "" });
        setSlotError("");
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
        setSelectedDate(null);
        setNewSlot({ start: "", end: "" });
        setSlotError("");
    };

    const isDateInPast = (dateKey) => {
        if (!dateKey) return false;
        const date = new Date(dateKey + "T00:00:00");
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return date < todayMidnight;
    };
    const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day) => selectedDate === toDateKey(viewYear, viewMonth, day);

  const hasSlots = (day) => {
    const key = toDateKey(viewYear, viewMonth, day);
    return availability[key]?.length > 0;
  };
  
  const hasUnsavedChanges = () => {
    if (!selectedDate) return false;
    return (availability[selectedDate] || []).some(
        (slot) => String(slot.id).startsWith("local_")
    );

  };

  const discardUnsavedSlots = () => {
    
    if (!selectedDate) return;
    setAvailability((prev) => {
        const savedSlots = (prev[selectedDate] || []).filter(
        (slot) => !String(slot.id).startsWith("local_")
        );

        const next = { ...prev };

        if (savedSlots.length === 0) {
        delete next[selectedDate];
        } else {
        next[selectedDate] = savedSlots;
        }

        return next;
    });
  };


  const handleDayClick = (day) => {

    // Remove unsaved local slots from previous selected date
    if (selectedDate) {
        setAvailability((prev) => {
        const existingSlots = prev[selectedDate] || [];
        const savedSlots = existingSlots.filter((s) => !String(s.id).startsWith("local_"));
        const next = { ...prev };
        if (savedSlots.length === 0) delete next[selectedDate];
        else next[selectedDate] = savedSlots;
        return next;
        });
    }
    setSelectedDate(toDateKey(viewYear, viewMonth, day));
    setNewSlot({ start: "", end: "" });
    setSlotError("");
    setConfirmDeleteId(null);
  };

  const selectedSlots = selectedDate ? (availability[selectedDate] || []) : [];

  const selectedLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : null;

  const addSlot = () => {
    if (!newSlot.start || !newSlot.end) {
      setSlotError("Please enter both start and end times.");
      return;
    }
    if (newSlot.start >= newSlot.end) {
      setSlotError("End time must be after start time.");
      return;
    }
    const startMs = new Date(`${selectedDate}T${newSlot.start}`).getTime();
    const endMs = new Date(`${selectedDate}T${newSlot.end}`).getTime();
    const diffMinutes = (endMs - startMs) / (1000 * 60);

    if (diffMinutes < 30) {
        setSlotError("Time slot must be at least 30 minutes.");
        return;
    }
    if (diffMinutes > 60){
        setSlotError("Time slot cannot be more than 60 minutes.");
        return;
    }
    const newStart = toUTCDatetime(selectedDate, newSlot.start);
    const newEnd = toUTCDatetime(selectedDate, newSlot.end);

    // Check overlap
    const existing = availability[selectedDate] || [];
    const overlaps = existing.some((s) => newStart < s.end && newEnd > s.start);
    if (overlaps) {
        setSlotError("This slot overlaps with an existing one.");
        return;
    }

    const slot = {id: `local_${Date.now()}`, start: toUTCDatetime(selectedDate, newSlot.start), end: toUTCDatetime(selectedDate, newSlot.end),};
    setAvailability((prev) => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), slot].sort((a, b) =>
        a.start.localeCompare(b.start)
      ),
    }));
    setNewSlot({ start: "", end: "" });
    setSlotError("");
  };

  const removeSlot = async (id) => {

    if (String(id).startsWith("local_")) {
        setAvailability((prev) => {
            const updated = (prev[selectedDate] || []).filter((s) => s.id !== id);
            const next = { ...prev };
            if (updated.length === 0) delete next[selectedDate];
            else next[selectedDate] = updated;
            return next;
        });
        setConfirmDeleteId(null);
        return;
    }

    setDeletingId(id);
    try {
        const response = await fetch(`http://localhost:8000/mentors/availability/${id}`, {
        method: "DELETE",
        });

        if (!response.ok) {
            const data = await response.json();
            setSlotError(data.detail || "Failed to delete slot.");
            return;
        }

        // remove from local state only after successful delete
        setAvailability((prev) => {
        const updated = (prev[selectedDate] || []).filter((s) => s.id !== id);
        const next = { ...prev };
        if (updated.length === 0) delete next[selectedDate];
        else next[selectedDate] = updated;
        return next;
        });
        setSlotError("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
        console.log(err)
        setSlotError("Network error. Please try again.");
    } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
    }


  };
  const handleSave = async () => {
    if (selectedSlots.length === 0) {
        setSlotError("Add at least one time slot before saving.");
        return;
    }
    setLoading(true);
    
    try {
        const response = await fetch("http://localhost:8000/mentors/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            slots: selectedSlots.map((slot) => ({
                start_datetime: slot.start,
                end_datetime: slot.end,
            })),
        }),
        });

        const data = await response.json();

        if (!response.ok) {
            setSlotError(data.detail || "Failed to save availability.");
        } else {
            setSlotError("");
            setAvailability((prev) => ({
                ...prev,
                [selectedDate]: data.slots.map((slot) => ({
                    id: slot.id,
                    start: slot.start_datetime,
                    end: slot.end_datetime,
                    is_booked: slot.is_booked, 
                })),
            }));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

        }
    } catch (err) {
        console.log(err)
        setSlotError("Network error. Please try again.");
    } finally {
        setLoading(false);
    }

};
    const confirmDiscard = () => {
        discardUnsavedSlots();
        setShowDiscardConfirm(false);
        closePanel();
    };


    const cancelDiscard = () => {
        setShowDiscardConfirm(false);
    };

    const closePanel = () => {
        setSelectedDate(null);
        setNewSlot({ start: "", end: "" });
        setSlotError("");
        setConfirmDeleteId(null);
    };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
        setShowDiscardConfirm(true);
        return;
    }

    closePanel();

    // setSelectedDate(null);
    // setNewSlot({ start: "", end: "" });
    // setSlotError("");
  };

  return (
    <div className="mav-page">
        <div className="mav-title-section">
            <h1 className="mav-title"> Update Availability</h1>
            <p className="mav-subtitle"> Select a date to add or edit your available meeting times.</p> 

        </div>
      {/* Calendar Panel */}
      <div className="mav-container">
        <div className="mav-calendar-panel">
            {loading && (
                <div className="mav-loading">
                    <div className="mav-spinner" />
                </div>
            )}
            <div className="mav-calendar-header">
                <button 
                    className="mav-nav-btn" 
                    onClick={prevMonth} 
                    disabled={viewMonth === today.getMonth() && viewYear === today.getFullYear()}
                    aria-label="Previous month" >
                    &#8249;
                </button>
                <h2 className="mav-month-title">
                    {MONTHS[viewMonth].toUpperCase()} {viewYear}
                </h2>
                <button className="mav-nav-btn" onClick={nextMonth} aria-label="Next month">
                    &#8250;
                </button>
            </div>

            <div className="mav-day-labels">
                {DAYS.map((d) => <span key={d} className="mav-day-label">{d}</span>)}
            </div>

            <div className="mav-grid">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="mav-cell mav-cell--empty" />
                ))}

                {calendarDays.map((day) => (
                    <button
                    key={day}
                    className={[
                        "mav-cell",
                        hasSlots(day) ? "mav-cell--available" : "",
                        isSelected(day) ? "mav-cell--selected" : "",
                        isSelected(day) && hasSlots(day) ? "mav-cell--selected-available" : "",
                        isToday(day) ? "mav-cell--today" : "",
                    ].join(" ")}
                    onClick={() => handleDayClick(day)}
                    >
                    <span className="mav-cell-number">{day}</span>
                    {/* {hasSlots(day) && <span className="mav-dot" />} */}
                    {hasSlots(day) && (
                        <div className="mav-slot-indicator">
                            {availability[toDateKey(viewYear, viewMonth, day)]
                            .slice(0, 5)
                            .map((_, index) => (
                                <span key={index} className="mav-dot" />
                            ))}
                        </div>
                    )}
                    </button>
                ))}
            </div>
        </div>

        {/* Right Panel */}
        {selectedDate && (
            <>
                <div className="mav-backdrop" onClick={handleCancel} />
                <div className={`mav-side-panel ${selectedDate ? "mav-side-panel--active" : ""}`}>
                {!selectedDate ? (
                <div className="mav-empty-state">
                    <p>Select a date to manage availability</p>
                </div>
                ) : (
                <>
                    <div className="mav-side-header">
                    <p className="mav-side-date">{selectedLabel}</p>
                    <h3 className="mav-side-title">Availability</h3>
                    </div>

                    <div className="mav-slots">
                    {selectedSlots.length === 0 && (
                        <p className="mav-no-slots">No slots added yet.</p>
                    )}
                    {selectedSlots.map((slot) => (
                    <div key={slot.id} className="mav-slot-wrapper">
                        <div className="mav-slot">
                        <span className="mav-slot-time">
                            {formatTime(slot.start)} – {formatTime(slot.end)}
                        </span>
                        {slot.is_booked ? null : (
                            <button
                            className="mav-slot-remove"
                            onClick={() => setConfirmDeleteId(confirmDeleteId === slot.id ? null : slot.id)}
                            aria-label="Remove slot"
                            >
                            <img src={TrashIcon} className="mav-trash-icon" />
                            </button>
                        )}
                        </div>

                        {/* Confirm row appears below the slot */}
                        {confirmDeleteId === slot.id && (
                        <div className="mav-confirm">
                            <span className="mav-confirm-text">Delete this slot?</span>
                            <div className="mav-confirm-actions">
                            <button className="mav-confirm-no" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            <button className="mav-confirm-yes" onClick={() => removeSlot(slot.id)} disabled={deletingId === slot.id} >{deletingId === slot.id ? "Deleting..." : "Delete"}</button>
                            </div>
                        </div>
                        )}
                    </div>
                    ))}
                    </div>

                    {/* Add time slot */}
                    {!isDateInPast(selectedDate) && (
                        <div className="mav-add-slot">
                        <div className="mav-time-inputs">
                            <div className="mav-time-field">
                            <label className="mav-time-label">Start</label>
                            <input
                                type="time"
                                className="mav-time-input"
                                value={newSlot.start}
                                onChange={(e) => { setNewSlot(p => ({ ...p, start: e.target.value })); setSlotError(""); }}
                            />
                            </div>
                            <span className="mav-time-sep">–</span>
                            <div className="mav-time-field">
                            <label className="mav-time-label">End</label>
                            <input
                                type="time"
                                className="mav-time-input"
                                value={newSlot.end}
                                onChange={(e) => { setNewSlot(p => ({ ...p, end: e.target.value })); setSlotError(""); }}
                            />
                            </div>
                        </div>
                        {slotError && <p className="mav-slot-error">{slotError}</p>}
                        <button className="mav-btn-add" onClick={addSlot}>
                            Add Time Slot
                        </button>
                        </div>
                    )}


                    {saveSuccess && (<div className="mav-toast"> Availability saved successfully!</div> )}
                    {showDiscardConfirm && (
                        <div className="mav-confirm-overlay">
                            <div className="mav-discard-box">
                            <h4>Unsaved Changes</h4>

                            <p>
                                You have unsaved availability changes. 
                                Do you want to discard them?
                            </p>

                            <div className="mav-discard-actions">
                                <button
                                className="mav-discard-cancel"
                                onClick={cancelDiscard}
                                >
                                Keep Editing
                                </button>

                                <button
                                className="mav-discard-confirm"
                                onClick={confirmDiscard}
                                >
                                Discard
                                </button>
                            </div>
                            </div>
                        </div>
                    )}
                    <div className="mav-side-footer">
                    <button className="mav-btn-cancel" onClick={handleCancel}>Cancel</button>
                    {!isDateInPast(selectedDate) && (
                        <button className="mav-btn-save" onClick={handleSave} disabled={loading}> {loading ? "Saving..." : "Save"} </button>
                    )}
                    </div>
                </>
                )}
            </div>

            </>
            
        )}
      </div>
      

    </div>
  );
}