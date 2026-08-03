import { useState, useMemo, useEffect } from "react";
import "./AvailabilityView.css";

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

// Convert UTC datetime to user's local YYYY-MM-DD
function getLocalDateKey(utcDatetime) {
  const d = new Date(utcDatetime);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MENTOR_ID = 7;

export default function AvailabilityView() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [bookedMeeting, setBookedMeeting] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/mentors/${MENTOR_ID}/availability`);
        if (!res.ok) {
          setAvailability({});
          return;
        }
        const data = await res.json();
        const grouped = {};
        
        data.forEach((slot) => {
          const dateKey = getLocalDateKey(slot.start_datetime);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(slot);
        });
        setAvailability(grouped);
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [viewMonth, viewYear]);

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
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
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

  const handleDayClick = (day) => {
    setSelectedDate(toDateKey(viewYear, viewMonth, day));
    setSelectedSlotId(null);
    setBookingError("");
    setBookedMeeting(null);
  };

  const selectedSlots = selectedDate ? (availability[selectedDate] || []) : [];

  const selectedLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : null;

  const handleBook = async () => {
    if (!selectedSlotId) {
      setBookingError("Please select a time slot first.");
      return;
    }
    setBooking(true);
    setBookingError("");

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      // NOTE: this hits the shared /google/student/meetings/book endpoint
      // (owned by another dev). It takes slot_id as a query param and has
      // no request body -- there is currently no student_notes field on
      // this view, so nothing is lost there.
      const res = await fetch(
        `http://localhost:8000/google/student/meetings/book?slot_id=${selectedSlotId}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBookingError(data.detail || "Failed to book meeting.");
        return;
      }

      const bookedData = await res.json();

      // /google/student/meetings/book returns { message, meeting_id, meeting_url,
      // start_datetime, end_datetime } -- normalize to the shape this component
      // reads below (bookedMeeting.id, .meeting_url, etc).
      setBookedMeeting({
        id: bookedData.meeting_id,
        meeting_url: bookedData.meeting_url,
        start_datetime: bookedData.start_datetime,
        end_datetime: bookedData.end_datetime,
      });

      // Remove the slot locally from state
      setAvailability((prev) => {
        const updated = (prev[selectedDate] || []).filter(s => s.id !== selectedSlotId);
        const next = { ...prev };
        if (updated.length === 0) delete next[selectedDate];
        else next[selectedDate] = updated;
        return next;
      });

      setSelectedSlotId(null);
    } catch (err) {
      console.error("Booking error:", err);
      setBookingError("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const closePanel = () => {
    setSelectedDate(null);
    setSelectedSlotId(null);
    setBookingError("");
    setBookedMeeting(null);
  };

  return (
    <div className="sav-page">
      <div className="sav-title-section">
        <h1 className="sav-title">Available Meeting Times</h1>
        <p className="sav-subtitle">Select a date and choose a time slot to book a session with your mentor.</p>
      </div>

      <div className="sav-container">
        <div className="sav-calendar-panel">
          {loading && (
            <div className="sav-loading">
              <div className="sav-spinner" />
            </div>
          )}

          <div className="sav-calendar-header">
            <button className="sav-nav-btn" onClick={prevMonth}
              disabled={viewMonth === today.getMonth() && viewYear === today.getFullYear()}>
              &#8249;
            </button>
            <h2 className="sav-month-title">{MONTHS[viewMonth].toUpperCase()} {viewYear}</h2>
            <button className="sav-nav-btn" onClick={nextMonth}>&#8250;</button>
          </div>

          <div className="sav-day-labels">
            {DAYS.map((d) => <span key={d} className="sav-day-label">{d}</span>)}
          </div>

          <div className="sav-grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="sav-cell sav-cell--empty" />
            ))}
            {calendarDays.map((day) => (
              <button
                key={day}
                className={[
                  "sav-cell",
                  hasSlots(day) ? "sav-cell--available" : "",
                  isSelected(day) ? "sav-cell--selected" : "",
                  isSelected(day) && hasSlots(day) ? "sav-cell--selected-available" : "",
                  isToday(day) ? "sav-cell--today" : "",
                ].join(" ")}
                onClick={() => handleDayClick(day)}
              >
                <span className="sav-cell-number">{day}</span>
                {hasSlots(day) && (
                  <div className="sav-slot-indicator">
                    {availability[toDateKey(viewYear, viewMonth, day)].slice(0, 5).map((_, i) => (
                      <span key={i} className="sav-dot" />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedDate && (
          <>
            <div className="sav-backdrop" onClick={closePanel} />
            <div className="sav-side-panel sav-side-panel--active">
              <div className="sav-side-header">
                <p className="sav-side-date">{selectedLabel}</p>
                <h3 className="sav-side-title">Available Times</h3>
              </div>

              <div className="sav-slots">
                {selectedSlots.length === 0 ? (
                  <p className="sav-no-slots">No available slots for this date.</p>
                ) : (
                  selectedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`sav-slot ${selectedSlotId === slot.id ? "sav-slot--selected" : ""}`}
                      onClick={() => { setSelectedSlotId(slot.id); setBookingError(""); }}
                    >
                      <span className="sav-slot-time">
                        {formatTime(slot.start_datetime)} — {formatTime(slot.end_datetime)}
                      </span>
                      {selectedSlotId === slot.id && <span className="sav-slot-check">✓</span>}
                    </div>
                  ))
                )}
              </div>

              {bookingError && <p className="sav-error">{bookingError}</p>}
              
              {bookedMeeting && (
                <div className="sav-toast">
                  <p><strong>Meeting booked successfully!</strong></p>
                  {bookedMeeting.meeting_url ? (
                    <a 
                      href={bookedMeeting.meeting_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="sav-meet-link"
                    >
                      Join Video Call
                    </a>
                  ) : (
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      Meeting details have been sent to your email.
                    </p>
                  )}
                </div>
              )}

              <div className="sav-side-footer">
                <button className="sav-btn-cancel" onClick={closePanel}>Cancel</button>
                <button className="sav-btn-book" onClick={handleBook} disabled={booking || !selectedSlotId}>
                  {booking ? "Booking..." : "Book Meeting"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}