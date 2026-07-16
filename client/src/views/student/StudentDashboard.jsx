import { useState, useMemo, useEffect } from "react";
import "./StudentDashboard.css";

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

const MENTOR_ID = 7;
const STUDENT_ID = 8;

const STEPS = [
  { label: "Request Submitted", done: true },
  { label: "Finding a Match", done: true },
  { label: "Schedule Meeting", active: true },
  { label: "Completed", done: false },
];

const MOCK_MENTOR = {
  name: "Siraj",
  title: "Software Engineer",
  company: "Google",
  degree: "B.S. Computer Science",
};

export default function StudentDashboard() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/mentors/${MENTOR_ID}/availability`);
        const data = await res.json();
        const grouped = {};
        data.forEach((slot) => {
          const dateKey = slot.start_datetime.split("T")[0];
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
    setBookingSuccess(false);
  };

  const selectedSlots = selectedDate ? (availability[selectedDate] || []) : [];

  const handleBook = async () => {
    if (!selectedSlotId) {
      setBookingError("Please select a time slot first.");
      return;
    }
    setBooking(true);
    setBookingError("");
    try {
      const res = await fetch(`http://localhost:8000/meetings?student_id=${STUDENT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: selectedSlotId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBookingError(data.detail || "Failed to book meeting.");
        return;
      }
      setBookingSuccess(true);
      setAvailability((prev) => {
        const updated = (prev[selectedDate] || []).filter(s => s.id !== selectedSlotId);
        const next = { ...prev };
        if (updated.length === 0) delete next[selectedDate];
        else next[selectedDate] = updated;
        return next;
      });
      setSelectedSlotId(null);
      setTimeout(() => setBookingSuccess(false), 4000);
    } catch (err) {
      setBookingError("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="sd-page">

      {/* Header */}
      <div className="sd-header">
        <h1 className="sd-welcome">Welcome Back, Applicant!</h1>
        <div className="sd-user-badge">
          <span className="sd-user-icon">👤</span>
          <span className="sd-user-name">Muhammad</span>
          <span className="sd-chevron">∨</span>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="sd-progress">
        {STEPS.map((step, i) => (
          <div key={i} className="sd-step-wrap">
            <div className={`sd-step-circle ${step.done ? "sd-step--done" : ""} ${step.active ? "sd-step--active" : ""}`}>
              {step.done ? "✓" : step.active ? "📅" : "🤝"}
            </div>
            <span className={`sd-step-label ${step.active ? "sd-step-label--active" : ""}`}>{step.label}</span>
            {i < STEPS.length - 1 && (
              <div className={`sd-step-line ${step.done ? "sd-step-line--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="sd-body">

        {/* Mentor Card */}
        <div className="sd-mentor-card">
          <p className="sd-mentor-label">👤 Your Mentor</p>
          <div className="sd-mentor-avatar">
            <span className="sd-avatar-icon">👤</span>
          </div>
          <h2 className="sd-mentor-name">{MOCK_MENTOR.name}</h2>
          <p className="sd-mentor-detail">{MOCK_MENTOR.title}</p>
          <p className="sd-mentor-detail">{MOCK_MENTOR.company}</p>
          <p className="sd-mentor-detail">{MOCK_MENTOR.degree}</p>
          <button className="sd-view-profile">View Profile</button>
        </div>

        {/* Calendar + Booking */}
        <div className="sd-calendar-card">
          <div className="sd-cal-header-row">
            <h3 className="sd-cal-title">📅 Choose Meeting Time</h3>
          </div>
          <div className="sd-cal-info">
            <span>ℹ️</span>
            <span>You're matched with {MOCK_MENTOR.name} — select a meeting time that works best for you</span>
          </div>
          <p className="sd-cal-tz">All times are in Eastern Standard Time (EST)</p>

          {/* Calendar */}
          <div className="sd-calendar">
            {loading && <div className="sd-loading"><div className="sd-spinner" /></div>}

            <div className="sd-cal-nav">
              <button className="sd-nav-btn" onClick={prevMonth}
                disabled={viewMonth === today.getMonth() && viewYear === today.getFullYear()}>‹</button>
              <span className="sd-month-title">{MONTHS[viewMonth].toUpperCase()} {viewYear}</span>
              <button className="sd-nav-btn" onClick={nextMonth}>›</button>
            </div>

            <div className="sd-day-labels">
              {DAYS.map(d => <span key={d} className="sd-day-label">{d}</span>)}
            </div>

            <div className="sd-grid">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e-${i}`} className="sd-cell sd-cell--empty" />
              ))}
              {calendarDays.map((day) => (
                <button
                  key={day}
                  className={[
                    "sd-cell",
                    hasSlots(day) ? "sd-cell--available" : "",
                    isSelected(day) ? "sd-cell--selected" : "",
                    isSelected(day) && hasSlots(day) ? "sd-cell--selected-available" : "",
                    isToday(day) ? "sd-cell--today" : "",
                  ].join(" ")}
                  onClick={() => handleDayClick(day)}
                >
                  <span className="sd-cell-num">{day}</span>
                  {hasSlots(day) && (
                    <div className="sd-dot-row">
                      {availability[toDateKey(viewYear, viewMonth, day)].slice(0, 3).map((_, i) => (
                        <span key={i} className="sd-dot" />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Slots for selected date */}
          {selectedDate && (
            <div className="sd-slots-section">
              <p className="sd-slots-date">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric"
                })}
              </p>
              {selectedSlots.length === 0 ? (
                <p className="sd-no-slots">No available slots for this date.</p>
              ) : (
                selectedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`sd-slot ${selectedSlotId === slot.id ? "sd-slot--selected" : ""}`}
                    onClick={() => { setSelectedSlotId(slot.id); setBookingError(""); }}
                  >
                    <span className="sd-slot-time">
                      {formatTime(slot.start_datetime)} – {formatTime(slot.end_datetime)}
                    </span>
                    {selectedSlotId === slot.id && <span className="sd-slot-check">✓</span>}
                  </div>
                ))
              )}
              {bookingError && <p className="sd-error">{bookingError}</p>}
              {bookingSuccess && <div className="sd-toast">✅ Meeting booked! Check your email for the link.</div>}
              {selectedSlots.length > 0 && (
                <button className="sd-confirm-btn" onClick={handleBook} disabled={booking || !selectedSlotId}>
                  {booking ? "Booking..." : "Confirm Meeting"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}