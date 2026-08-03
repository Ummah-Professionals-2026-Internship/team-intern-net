import { useState, useMemo, useEffect, useCallback } from "react";
import "./StudentDashboard.css";

const DAYS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EST_TIMEZONE = "America/New_York";

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatExternalUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `https://${url}`;
}

function formatTime(utcDatetime) {
  if (!utcDatetime) return "";
  return new Date(utcDatetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EST_TIMEZONE,
  });
}

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  return utcDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function StudentDashboard() {
  const today = useMemo(() => new Date(), []);
  
  // 1. Dashboard State
  const [studentProfile, setStudentProfile] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [upcomingMeeting, setUpcomingMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMentorModal, setShowMentorModal] = useState(false);

  // 2. Calendar State
  const [viewYear, setViewYear] = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  
  // 3. User Input & Modal State
  const [studentNotes, setStudentNotes] = useState("");
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booking, setBooking] = useState(false);

  const estTodayKey = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: EST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const m = parts.find((p) => p.type === "month").value;
    const d = parts.find((p) => p.type === "day").value;
    const y = parts.find((p) => p.type === "year").value;
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const profileRes = await fetch("http://localhost:8000/student/profile", { headers });
        if (!profileRes.ok) throw new Error("Failed to load profile context.");
        
        const profileData = await profileRes.json();
        setStudentProfile(profileData);

        const activeMentor = profileData?.mentor || profileData?.assigned_mentor;
        if (activeMentor) {
          setMentor({
            ...activeMentor,
            name: activeMentor.name || activeMentor.full_name || "Assigned Mentor",
          });
        }

        const meetingsRes = await fetch("http://localhost:8000/student/meetings", { headers });
        if (meetingsRes.ok) {
          const meetings = await meetingsRes.json();
          if (meetings?.length > 0) {
            setUpcomingMeeting(meetings[0]);
          }
        }
      } catch (err) {
        console.error("Error setting up application dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const mentorId = mentor?.id;
  useEffect(() => {
    if (!mentorId || upcomingMeeting) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`http://localhost:8000/mentors/${mentorId}/availability`);
        if (!res.ok) throw new Error("Could not fetch availability slots.");
        
        const data = await res.json();
        const grouped = {};
        
        data.forEach((slot) => {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: EST_TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(new Date(slot.start_datetime));

          const m = parts.find((p) => p.type === "month").value;
          const d = parts.find((p) => p.type === "day").value;
          const y = parts.find((p) => p.type === "year").value;
          const dateKey = `${y}-${m}-${d}`;
          
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(slot);
        });

        if (isMounted) setAvailability(grouped);
      } catch (err) {
        console.error("Failed to fetch mentor slots:", err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => { isMounted = false; };
  }, [viewMonth, viewYear, mentorId, upcomingMeeting]);

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

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }, [viewMonth]);

  const isToday = (day) => toDateKey(viewYear, viewMonth, day) === estTodayKey;
  const isSelected = (day) => selectedDate === toDateKey(viewYear, viewMonth, day);
  const hasSlots = (day) => Boolean(availability[toDateKey(viewYear, viewMonth, day)]?.length);

  const handleDayClick = (day) => {
    setSelectedDate(toDateKey(viewYear, viewMonth, day));
    setSelectedSlotId(null);
    setStudentNotes(""); 
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

      // NOTE: this hits the shared /google/student/meetings/book endpoint
      // (owned by another dev). It takes slot_id as a query param, has no
      // request body, and does not currently accept student_notes -- so
      // studentNotes is collected in the UI but not persisted server-side
      // until that endpoint supports it.
      const res = await fetch(
        `http://localhost:8000/google/student/meetings/book?slot_id=${selectedSlotId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
        }
      );

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        let errorMsg = "Failed to book meeting.";
        if (typeof resData.detail === "string") {
          errorMsg = resData.detail;
        } else if (Array.isArray(resData.detail) && resData.detail[0]?.msg) {
          errorMsg = `${resData.detail[0].loc?.join(" -> ")}: ${resData.detail[0].msg}`;
        }
        setBookingError(errorMsg);
        return;
      }

      // /google/student/meetings/book returns { message, meeting_id, meeting_url,
      // start_datetime, end_datetime } -- normalize it to the shape the rest of
      // this component expects (upcomingMeeting.id, .meeting_url, etc).
      setUpcomingMeeting({
        id: resData.meeting_id,
        start_datetime: resData.start_datetime,
        end_datetime: resData.end_datetime,
        meeting_url: resData.meeting_url,
      });
      setShowConfirmedModal(true);
      setSelectedSlotId(null);
      setStudentNotes("");
    } catch (err) {
      setBookingError("Network validation failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!upcomingMeeting) return;
    if (!window.confirm("Are you sure you want to cancel this mentorship session?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/meetings/${upcomingMeeting.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        alert("Failed to cancel the meeting. Please try again.");
        return;
      }

      setUpcomingMeeting(null);
      setSelectedDate(null);
      setSelectedSlotId(null);
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

      {/* Progress Tracker Map */}
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

      {/* Main Body */}
      <div className="sd-body">
        {!mentor ? (
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
        ) : (
          <>
            {/* Left Column: Mentor Card */}
            <div className="sd-mentor-card">
              <p className="sd-mentor-label">👤 Your Mentor</p>
              <div className="sd-mentor-avatar">
                <span className="sd-avatar-icon">👤</span>
              </div>
              <h2 className="sd-mentor-name">{mentor.name}</h2>
              <p className="sd-mentor-detail">{mentor.job_title || "Professional Profile"}</p>
              <p className="sd-mentor-detail">{mentor.employer || "Industry Group"}</p>
              <p className="sd-mentor-detail">{mentor.industry || "Field Expert"}</p>
              
              {(mentor.linkedin || mentor.linkedin_url) && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '8px', marginBottom: '8px' }}>
                  <a 
                    href={formatExternalUrl(mentor.linkedin || mentor.linkedin_url)} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      color: '#0077b5', 
                      textDecoration: 'none', 
                      fontWeight: '600', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.9rem' 
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0077b5">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    Connect on LinkedIn
                  </a>
                </div>
              )}

              <button onClick={() => setShowMentorModal(true)} className="sd-view-profile">View Profile</button>
            </div>

            {/* Right Column: Calendar / Session */}
            {upcomingMeeting ? (
              <div className="sd-calendar-card sd-final-dash-card">
                <div className="sd-cal-header-row">
                  <h3 className="sd-cal-title">📅 Upcoming Meeting</h3>
                </div>
                <div className="sd-upcoming-session-box">
                  <h4>Career Advice with {mentor.name}</h4>
                  <div className="sd-session-details">
                    <p>📅 {formatDateLong(upcomingMeeting.start_datetime?.split("T")[0])}</p>
                    <p>⏰ {formatTime(upcomingMeeting.start_datetime)} – {formatTime(upcomingMeeting.end_datetime)} (Eastern Time)</p>
                    <p>📹 Meeting Platform: Google Meet</p>
                  </div>
                  <div className="sd-action-buttons-row" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <a 
                      href={upcomingMeeting.meeting_url || upcomingMeeting.google_meet_link || "#"} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="sd-join-btn"
                      style={{ flex: 1, textAlign: 'center', display: 'block' }}
                    >
                      Join Google Meet
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
              <div className="sd-calendar-card">
                <div className="sd-cal-header-row">
                  <h3 className="sd-cal-title">📅 Choose Meeting Time</h3>
                </div>
                
                <div className="sd-cal-info" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                  <span>⚠️</span>
                  <span><strong>Notice:</strong> All schedule windows are displayed in <strong>Eastern Time (EST/EDT)</strong>. Please manually adjust if you are booking from another timezone.</span>
                </div>

                <div className="sd-calendar">
                  {loadingSlots && <div className="sd-loading"><div className="sd-spinner" /></div>}

                  <div className="sd-cal-nav">
                    <button 
                      className="sd-nav-btn" 
                      onClick={prevMonth}
                      disabled={viewMonth === today.getMonth() && viewYear === today.getFullYear()}
                    >
                      ‹
                    </button>
                    <span className="sd-month-title">{MONTHS[viewMonth].toUpperCase()} {viewYear}</span>
                    <button className="sd-nav-btn" onClick={nextMonth}>›</button>
                  </div>

                  <div className="sd-day-labels">
                    {DAYS.map((d) => <span key={d} className="sd-day-label">{d}</span>)}
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
                      {formatDateLong(selectedDate)} (EST)
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
                            setBookingError(""); 
                          }}
                        >
                          <span className="sd-slot-time">
                            {formatTime(slot.start_datetime)} – {formatTime(slot.end_datetime)} EST
                          </span>
                          {selectedSlotId === slot.id && <span className="sd-slot-check">✓</span>}
                        </div>
                      ))
                    )}
                    
                    {selectedSlots.length > 0 && (
                      <div className="sd-notes-container" style={{ marginTop: "16px", marginBottom: "12px" }}>
                        <label 
                          htmlFor="dashboard-student-notes" 
                          style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151", textAlign: "left" }}
                        >
                          What would you like to discuss? (Optional)
                        </label>
                        <textarea
                          id="dashboard-student-notes"
                          rows="3"
                          maxLength="500"
                          placeholder="e.g., Help reviewing my DevOps resume, backend engineering roadmaps, or interview prep advice..."
                          value={studentNotes}
                          onChange={(e) => setStudentNotes(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            fontSize: "0.875rem",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            resize: "none",
                            fontFamily: "inherit",
                            boxSizing: "border-box"
                          }}
                        />
                        <span style={{ display: "block", textAlign: "right", fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
                          {studentNotes.length}/500 characters
                        </span>
                      </div>
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

      {/* Confirmation Modal */}
      {showConfirmedModal && upcomingMeeting && (
        <div className="sd-modal-overlay">
          <div className="sd-modal-content">
            <div className="sd-modal-success-icon">✓</div>
            <h2>Meeting Confirmed!</h2>
            <p className="sd-modal-subtext">Your Career Advice session with <strong>{mentor?.name}</strong> has been scheduled.</p>
            
            <div className="sd-modal-receipt-box">
              <p>📅 {formatDateLong(upcomingMeeting.start_datetime?.split("T")[0])}</p>
              <p>⏰ {formatTime(upcomingMeeting.start_datetime)} – {formatTime(upcomingMeeting.end_datetime)} EST</p>
              <p>📹 Meeting Platform: Google Meet</p>
              {upcomingMeeting.meeting_url && (
                <p style={{ wordBreak: 'break-all', marginTop: '6px' }}>
                  🔗 <strong>Google Meet Link:</strong>{' '}
                  <a href={upcomingMeeting.meeting_url} target="_blank" rel="noreferrer" style={{ color: '#0f766e' }}>
                    {upcomingMeeting.meeting_url}
                  </a>
                </p>
              )}
            </div>
            
            <p className="sd-modal-footer-notice">Google Meet invite details have been emailed to you.</p>
            <button className="sd-modal-close-btn" onClick={() => setShowConfirmedModal(false)}>
              View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Mentor Bio Modal */}
      {showMentorModal && mentor && (
        <div className="sd-modal-overlay" onClick={() => setShowMentorModal(false)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                👤
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#0f766e', fontSize: '1.4rem' }}>{mentor.name}</h3>
                <p style={{ margin: 0, color: '#4b5563', fontWeight: '500' }}>{mentor.job_title || "Professional Profile"}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', color: '#374151' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🏢</span>
                <span><strong>Employer / Company:</strong> {mentor.employer || "N/A"}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🌐</span>
                <span><strong>Focus Industry:</strong> {mentor.industry || "N/A"}</span>
              </div>

              {mentor.alma_mater && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🎓</span>
                  <span><strong>Alma Mater:</strong> {mentor.alma_mater}</span>
                </div>
              )}

              {(mentor.county || mentor.state) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>📍</span>
                  <span>
                    <strong>Location:</strong> {mentor.county ? `${mentor.county}, ` : ""}{mentor.state || ""}
                  </span>
                </div>
              )}
              
              {(mentor.linkedin || mentor.linkedin_url) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0077b5" style={{ flexShrink: 0 }}>
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </div>
                  <span>
                    <strong>LinkedIn Profile:</strong>{' '}
                    <a 
                      href={formatExternalUrl(mentor.linkedin || mentor.linkedin_url)} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: '#0077b5', fontWeight: '600', textDecoration: 'none' }}
                    >
                      View Profile
                    </a>
                  </span>
                </div>
              )}

              {mentor.service_types?.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <p style={{ fontWeight: '600', margin: '0 0 6px 0' }}>Expertise Offerings:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {mentor.service_types.map((type, index) => (
                      <span 
                        key={index} 
                        style={{ 
                          backgroundColor: '#f0fdf4', 
                          color: '#166534', 
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem',
                          fontWeight: '500' 
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
              
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>About Your Mentor:</p>
              <p style={{ color: '#6b7280', lineHeight: '1.5', fontStyle: mentor.bio ? 'normal' : 'italic', marginTop: 0 }}>
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