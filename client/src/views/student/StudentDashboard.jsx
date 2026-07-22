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

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export default function StudentDashboard() {
  const today = new Date();
  
  // Application Dynamic States
  const [studentProfile, setStudentProfile] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [upcomingMeeting, setUpcomingMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMentorModal, setShowMentorModal] = useState(false);

  // Calendar Engine States
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  
  // Booking UI Status Flags
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booking, setBooking] = useState(false);

  // 1. Load active student application & schedule telemetry data
  useEffect(() => {
    const fetchDashboardContextData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch base student match meta-profile
        const profileRes = await fetch("http://localhost:8000/student/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error("Failed to load profile context.");
        
        const profileData = await profileRes.json();
        setStudentProfile(profileData);

        // NORMALIZATION LAYER: Catches key variations between backend models and frontend layout
        const activeMentor = profileData?.mentor || profileData?.assigned_mentor;
        if (activeMentor) {
          setMentor({
            ...activeMentor,
            name: activeMentor.name || activeMentor.full_name || "Assigned Mentor"
          });
        }

        // Fetch any existing confirmed meetings for the user (Hitting the /student prefix route)
        const meetingsRes = await fetch("http://localhost:8000/student/meetings", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (meetingsRes.ok) {
          const meetings = await meetingsRes.json();
          if (meetings && meetings.length > 0) {
            setUpcomingMeeting(meetings[0]);
          }
        }
      } catch (err) {
        console.error("Error setting up application dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardContextData();
  }, []);

  // 2. Fetch mentor slot availability windows dynamically if matched
  useEffect(() => {
    if (!mentor?.id || upcomingMeeting) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`http://localhost:8000/mentors/${mentor.id}/availability`);
        const data = await res.json();
        const grouped = {};
        data.forEach((slot) => {
          const dateKey = slot.start_datetime.split("T")[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(slot);
        });
        setAvailability(grouped);
      } catch (err) {
        console.error("Failed to query mentor calendar metrics:", err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [viewMonth, viewYear, mentor, upcomingMeeting]);

  // Compute Dynamic Application Steps for Progress Bar Layout
  const steps = useMemo(() => {
    if (upcomingMeeting) {
      return [
        { label: "Request Submitted", done: true },
        { label: "Finding a Match", done: true },
        { label: "Schedule Meeting", done: true },
        { label: "Completed", done: false, active: true },
      ];
    }
    if (mentor) {
      return [
        { label: "Request Submitted", done: true },
        { label: "Finding a Match", done: true },
        { label: "Schedule Meeting", done: false, active: true },
        { label: "Completed", done: false },
      ];
    }
    return [
      { label: "Request Submitted", done: true },
      { label: "Finding a Match", done: false, active: true },
      { label: "Schedule Meeting", done: false },
      { label: "Completed", done: false },
    ];
  }, [mentor, upcomingMeeting]);

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
    setSelectedSlotDetails(null);
    setBookingError("");
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
      const token = localStorage.getItem("token");
      
      // Fetch the correct student identifier to append as a query param
      const studentId = studentProfile?.id || studentProfile?.user_id;
      
      // Pass the student_id in the query parameters as the backend expects
      const res = await fetch(`http://localhost:8000/meetings?student_id=${studentId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ slot_id: selectedSlotId }),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        // Safe parsing: Avoid passing a raw array object to React state
        let errorMsg = "Failed to book meeting.";
        if (typeof resData.detail === "string") {
          errorMsg = resData.detail;
        } else if (Array.isArray(resData.detail) && resData.detail[0]?.msg) {
          errorMsg = `${resData.detail[0].loc.join(" -> ")}: ${resData.detail[0].msg}`;
        }
        setBookingError(errorMsg);
        return;
      }
      
      setUpcomingMeeting(resData);
      setShowConfirmedModal(true);
      setSelectedSlotId(null);
    } catch (err) {
      setBookingError("Network validation failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!upcomingMeeting) return;
    
    const confirmCancel = window.confirm("Are you sure you want to cancel this mentorship session?");
    if (!confirmCancel) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/meetings/${upcomingMeeting.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        alert("Failed to cancel the meeting. Please try again.");
        return;
      }

      // Reset local state immediately to force re-render back to the calendar view
      setUpcomingMeeting(null);
      setSelectedDate(null);
      setSelectedSlotId(null);
      
      // Re-fetch profile context data to populate fresh slots if necessary
      window.location.reload(); 
    } catch (err) {
      console.error("Error canceling meeting:", err);
      alert("Network error. Could not cancel meeting.");
    }
  };

  if (loading) {
    return <div className="sd-loading-page">Loading dashboard data...</div>;
  }

  return (
    <div className="sd-page">
      {/* Header Bar */}
      <div className="sd-header">
        <h1 className="sd-welcome">Welcome Back, {studentProfile?.full_name || "Applicant"}!</h1>
        <div className="sd-user-badge">
          <span className="sd-user-icon">👤</span>
          <span className="sd-user-name">{studentProfile?.full_name?.split(" ")[0] || "Applicant"}</span>
          <span className="sd-chevron">∨</span>
        </div>
      </div>

      {/* Dynamic Process Tracker Map */}
      <div className="sd-progress">
        {steps.map((step, i) => (
          <div key={i} className="sd-step-wrap">
            <div className={`sd-step-circle ${step.done ? "sd-step--done" : ""} ${step.active ? "sd-step--active" : ""}`}>
              {step.done ? "✓" : step.active && !upcomingMeeting ? "📅" : "🤝"}
            </div>
            <span className={`sd-step-label ${step.active ? "sd-step-label--active" : ""}`}>{step.label}</span>
            {i < steps.length - 1 && (
              <div className={`sd-step-line ${step.done ? "sd-step-line--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content Canvas */}
      <div className="sd-body">
        
        {/* VIEW 1: Finding A Match (Fallback State) */}
        {!mentor && (
          <div className="sd-matching-card">
            <div className="sd-illustration-search">
              <span className="sd-search-icon">🔍</span>
              <span className="sd-avatar-icon-small">👤</span>
            </div>
            <h2>We're currently finding the right mentor for you!</h2>
            <p>Your career form request is being carefully reviewed.</p>
            <p>We will email you once we've found the best mentor match for your career goals.</p>
            <div className="sd-thanks-note">
              <span>⏳</span> Thank you for your patience.
            </div>
          </div>
        )}

        {mentor && (
          <>
            {/* Left Box Column: Active Profile Meta Card */}
            <div className="sd-mentor-card">
              <p className="sd-mentor-label">👤 Your Mentor</p>
              <div className="sd-mentor-avatar">
                <span className="sd-avatar-icon">👤</span>
              </div>
              <h2 className="sd-mentor-name">{mentor.name}</h2>
              <p className="sd-mentor-detail">{mentor.job_title || "Professional Profile"}</p>
              <p className="sd-mentor-detail">{mentor.employer || "Industry Group"}</p>
              <p className="sd-mentor-detail">{mentor.industry || "Field Expert"}</p>
              {/* 💡 Fixed below: onClick now safely calls an arrow function to prevent render crashing loops */}
              <button onClick={() => setShowMentorModal(true)} className="sd-view-profile">View Profile</button>
            </div>

            {/* Right Box Column: Booking Grid / Upcoming Meeting */}
            {upcomingMeeting ? (
              /* VIEW 3: Final Dash (Meeting Scheduled Card) */
              <div className="sd-calendar-card sd-final-dash-card">
                <div className="sd-cal-header-row">
                  <h3 className="sd-cal-title">📅 Upcoming Meeting</h3>
                </div>
                <div className="sd-upcoming-session-box">
                  <h4>Career Advice with {mentor.name}</h4>
                  <div className="sd-session-details">
                    <p>📅 {formatDateLong(upcomingMeeting.start_datetime?.split("T")[0])}</p>
                    <p>⏰ {formatTime(upcomingMeeting.start_datetime)} – {formatTime(upcomingMeeting.end_datetime)} ({userTimezone})</p>
                    <p>📹 Google Meet</p>
                  </div>
                  <div className="sd-action-buttons-row" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <a 
                      href={upcomingMeeting.meeting_url || "#"} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="sd-join-btn"
                      style={{ flex: 1, textAlign: 'center', display: 'block' }}
                    >
                      Join Meeting Link
                    </a>
                    <button 
                      onClick={handleCancelMeeting}
                      className="sd-dashboard-cancel-btn"
                      style={{
                        flex: 1,
                        backgroundColor: '#ff4d4d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: '10px'
                      }}
                    >
                      Cancel / Reschedule
                    </button>
                  </div>
                </div>
              </div>
            ) : (  
              /* VIEW 2: Choose Time Booking Engine */
              <div className="sd-calendar-card">
                <div className="sd-cal-header-row">
                  <h3 className="sd-cal-title">📅 Choose Meeting Time</h3>
                </div>
                <div className="sd-cal-info">
                  <span>ℹ️</span>
                  <span>You're matched with {mentor.name} — select a meeting time that works best for you</span>
                </div>
                <p className="sd-cal-tz">All times are displayed locally ({userTimezone})</p>

                <div className="sd-calendar">
                  {loadingSlots && <div className="sd-loading"><div className="sd-spinner" /></div>}

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
                          onClick={() => { 
                            setSelectedSlotId(slot.id); 
                            setSelectedSlotDetails(slot);
                            setBookingError(""); 
                          }}
                        >
                          <span className="sd-slot-time">
                            {formatTime(slot.start_datetime)} – {formatTime(slot.end_datetime)}
                          </span>
                          {selectedSlotId === slot.id && <span className="sd-slot-check">✓</span>}
                        </div>
                      ))
                    )}
                    {bookingError && <p className="sd-error">{bookingError}</p>}
                    {selectedSlots.length > 0 && (
                      <button className="sd-confirm-btn" onClick={handleBook} disabled={booking || !selectedSlotId}>
                        {booking ? "Booking..." : "Confirm Meeting"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* CONFIRMED TRANSACTION POPUP MODAL SCREEN */}
      {showConfirmedModal && upcomingMeeting && (
        <div className="sd-modal-overlay">
          <div className="sd-modal-content">
            <div className="sd-modal-success-icon">✓</div>
            <h2>Meeting Confirmed!</h2>
            <p className="sd-modal-subtext">Your Career Advice session with <strong>{mentor?.name}</strong> has been scheduled.</p>
            
            <div className="sd-modal-receipt-box">
              <p>📅 {formatDateLong(upcomingMeeting.start_datetime?.split("T")[0])}</p>
              <p>⏰ {formatTime(upcomingMeeting.start_datetime)} – {formatTime(upcomingMeeting.end_datetime)}</p>
              <p>📹 Google Meet</p>
            </div>
            
            <p className="sd-modal-footer-notice">Meeting details have been emailed to you.</p>
            <button className="sd-modal-close-btn" onClick={() => setShowConfirmedModal(false)}>
              View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ================= MENTOR DETAILED BIO MODAL ================= */}
      {showMentorModal && mentor && (
        <div className="sd-modal-overlay" onClick={() => setShowMentorModal(false)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '500px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                👤
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#0f766e', fontSize: '1.4rem' }}>{mentor.name}</h3>
                <p style={{ margin: 0, color: '#4b5563', fontWeight: '500' }}>{mentor.job_title || "DevOps ENG"}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', color: '#374151' }}>
              <p><strong>🏢 Employer / Company:</strong> {mentor.employer || "CU"}</p>
              <p><strong>🌐 Focus Industry:</strong> {mentor.industry || "IT"}</p>
              
              <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '10px 0' }} />
              
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>About Your Mentor:</p>
              <p style={{ color: '#6b7280', lineHeight: '1.5', fontStyle: mentor.bio ? 'normal' : 'italic' }}>
                {mentor.bio || "No professional biography has been provided yet by the mentor. Use your scheduled meeting to ask them about their career path and field experiences!"}
              </p>
            </div>

            <button 
              onClick={() => setShowMentorModal(false)}
              style={{
                marginTop: '24px',
                width: '100%',
                backgroundColor: '#0f766e',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}