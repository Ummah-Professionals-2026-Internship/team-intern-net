import { useState, useMemo, useEffect, useCallback } from "react";
import "./StudentDashboard.css";
import api from '../../api/api'; // adjust path as needed


const DAYS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EST_TIMEZONE = "America/New_York";
const MIN_BOOKING_LEAD_HOURS = 24;
const MIN_CANCELLATION_LEAD_HOURS = 24;

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
        const profileRes = await api.get("/student/profile");
        const profileData = profileRes.data;
        setStudentProfile(profileData);

        const activeMentor = profileData?.mentor || profileData?.assigned_mentor;
        if (activeMentor) {
          setMentor({
            ...activeMentor,
            name: activeMentor.name || activeMentor.full_name || "Assigned Mentor",
          });
        }

        const meetingsRes = await api.get("/student/meetings");
        const meetings = meetingsRes.data;
        if (meetings?.length > 0) {
          setUpcomingMeeting(meetings[0]);
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
        const res = await api.get(`/mentors/${mentorId}/availability`);
        const data = res.data;
        const grouped = {};

        const earliestBookable = new Date(Date.now() + MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000);

        data.forEach((slot) => {
          if (new Date(slot.start_datetime) < earliestBookable) return;

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

  const selectedSlotObj = selectedSlots.find((s) => s.id === selectedSlotId);
  const earliestBookableNow = new Date(Date.now() + MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000);
  const selectedSlotUnbookable = Boolean(
    selectedSlotObj && new Date(selectedSlotObj.start_datetime) < earliestBookableNow
  );

  const handleBook = async () => {
    if (!selectedSlotId) {
      setBookingError("Please select a time slot first.");
      return;
    }
    if (selectedSlotUnbookable) {
      setBookingError("This slot must be booked at least 24 hours in advance. Please choose another time.");
      return;
    }

    setBooking(true);
    setBookingError("");

    try {
      const res = await api.post(`/google/student/meetings/book?slot_id=${selectedSlotId}`);
      const resData = res.data;

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
      const resData = err.response?.data;
      let errorMsg = "Failed to book meeting.";
      if (typeof resData?.detail === "string") {
        errorMsg = resData.detail;
      } else if (Array.isArray(resData?.detail) && resData.detail[0]?.msg) {
        errorMsg = `${resData.detail[0].loc?.join(" -> ")}: ${resData.detail[0].msg}`;
      }
      setBookingError(errorMsg);
    } finally {
      setBooking(false);
    }
  };

  const meetingCancellable = upcomingMeeting
    ? new Date(upcomingMeeting.start_datetime).getTime() - Date.now() > MIN_CANCELLATION_LEAD_HOURS * 60 * 60 * 1000
    : false;

  const handleCancelMeeting = async () => {
    if (!upcomingMeeting) return;
    if (!meetingCancellable) {
      alert(`This meeting can no longer be cancelled -- it's within ${MIN_CANCELLATION_LEAD_HOURS} hours of the scheduled start time.`);
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this mentorship session?")) return;

    try {
      await api.delete(`/meetings/${upcomingMeeting.id}`);
      setUpcomingMeeting(null);
      setSelectedDate(null);
      setSelectedSlotId(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(detail || "Failed to cancel the meeting. Please try again.");
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
        {/* <div className="sd-user-badge">
          <span className="sd-user-icon">👤</span>
          <span className="sd-user-name">{studentProfile?.full_name?.split(" ")[0] || "Applicant"}</span>
          <span className="sd-chevron">∨</span>
        </div> */}
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
              <div className="sd-mentor-card-header">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M26.6667 28C26.6667 24.3181 21.891 21.3333 16 21.3333C10.109 21.3333 5.33334 24.3181 5.33334 28M16 17.3333C12.3181 17.3333 9.33334 14.3486 9.33334 10.6667C9.33334 6.98477 12.3181 4 16 4C19.6819 4 22.6667 6.98477 22.6667 10.6667C22.6667 14.3486 19.6819 17.3333 16 17.3333Z" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="sd-mentor-label">Your Mentor</p>

              </div>
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
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
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
                      disabled={!meetingCancellable}
                      title={meetingCancellable ? undefined : `Cannot cancel within ${MIN_CANCELLATION_LEAD_HOURS} hours of the meeting`}
                      style={{
                        flex: 1,
                        backgroundColor: meetingCancellable ? '#ff4d4d' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: meetingCancellable ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        padding: '10px'
                      }}
                    >
                      {meetingCancellable ? "Cancel / Reschedule" : "Cancellation Window Closed"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sd-calendar-card">
                <div className="sd-cal-header-row">
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.21862 11.0184C6.90551 11.0184 7.46235 10.4546 7.46235 9.75911C7.46235 9.06365 6.90551 8.49987 6.21862 8.49987C5.53173 8.49987 4.9749 9.06365 4.9749 9.75911C4.9749 10.4546 5.53173 11.0184 6.21862 11.0184Z" fill="#007CA6" />
                    <path d="M13.681 9.75911C13.681 10.4546 13.1241 11.0184 12.4372 11.0184C11.7504 11.0184 11.1935 10.4546 11.1935 9.75911C11.1935 9.06365 11.7504 8.49987 12.4372 8.49987C13.1241 8.49987 13.681 9.06365 13.681 9.75911Z" fill="#007CA6" />
                    <path d="M18.6559 11.0184C19.3428 11.0184 19.8996 10.4546 19.8996 9.75911C19.8996 9.06365 19.3428 8.49987 18.6559 8.49987C17.969 8.49987 17.4121 9.06365 17.4121 9.75911C17.4121 10.4546 17.969 11.0184 18.6559 11.0184Z" fill="#007CA6" />
                    <path d="M7.46235 14.1665C7.46235 14.8619 6.90551 15.4257 6.21862 15.4257C5.53173 15.4257 4.9749 14.8619 4.9749 14.1665C4.9749 13.471 5.53173 12.9072 6.21862 12.9072C6.90551 12.9072 7.46235 13.471 7.46235 14.1665Z" fill="#007CA6" />
                    <path d="M12.4372 15.4257C13.1241 15.4257 13.681 14.8619 13.681 14.1665C13.681 13.471 13.1241 12.9072 12.4372 12.9072C11.7504 12.9072 11.1935 13.471 11.1935 14.1665C11.1935 14.8619 11.7504 15.4257 12.4372 15.4257Z" fill="#007CA6" />
                    <path d="M19.8996 14.1665C19.8996 14.8619 19.3428 15.4257 18.6559 15.4257C17.969 15.4257 17.4121 14.8619 17.4121 14.1665C17.4121 13.471 17.969 12.9072 18.6559 12.9072C19.3428 12.9072 19.8996 13.471 19.8996 14.1665Z" fill="#007CA6" />
                    <path d="M6.21862 19.833C6.90551 19.833 7.46235 19.2693 7.46235 18.5738C7.46235 17.8783 6.90551 17.3146 6.21862 17.3146C5.53173 17.3146 4.9749 17.8783 4.9749 18.5738C4.9749 19.2693 5.53173 19.833 6.21862 19.833Z" fill="#007CA6" />
                    <path d="M13.681 18.5738C13.681 19.2693 13.1241 19.833 12.4372 19.833C11.7504 19.833 11.1935 19.2693 11.1935 18.5738C11.1935 17.8783 11.7504 17.3146 12.4372 17.3146C13.1241 17.3146 13.681 17.8783 13.681 18.5738Z" fill="#007CA6" />
                    <path d="M18.6559 19.833C19.3428 19.833 19.8996 19.2693 19.8996 18.5738C19.8996 17.8783 19.3428 17.3146 18.6559 17.3146C17.969 17.3146 17.4121 17.8783 17.4121 18.5738C17.4121 19.2693 17.969 19.833 18.6559 19.833Z" fill="#007CA6" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M7.15142 0.94443C7.15142 0.422836 6.73379 0 6.21862 0C5.70346 0 5.28583 0.422836 5.28583 0.94443H4.9749C2.22734 0.94443 0 3.19956 0 5.98139V19.833C0 22.6149 2.22734 24.87 4.9749 24.87H19.8996C22.6472 24.87 24.8745 22.6149 24.8745 19.833V5.98139C24.8745 3.19955 22.6472 0.94443 19.8996 0.94443H19.5887C19.5887 0.422836 19.171 0 18.6559 0C18.1407 0 17.7231 0.422836 17.7231 0.94443H7.15142ZM17.7231 4.72215V2.83329H7.15142V4.72215C7.15142 5.24375 6.73379 5.66658 6.21862 5.66658C5.70346 5.66658 5.28583 5.24375 5.28583 4.72215V2.83329H4.9749C3.25767 2.83329 1.86559 4.24274 1.86559 5.98139V19.833C1.86559 21.5717 3.25767 22.9811 4.9749 22.9811H19.8996C21.6168 22.9811 23.0089 21.5717 23.0089 19.833V5.98139C23.0089 4.24274 21.6168 2.83329 19.8996 2.83329H19.5887V4.72215C19.5887 5.24375 19.171 5.66658 18.6559 5.66658C18.1407 5.66658 17.7231 5.24375 17.7231 4.72215Z" fill="#007CA6" />
                  </svg>
                  <h3 className="sd-cal-title">Choose Meeting Time</h3>
                </div>

                <div className="sd-cal-info" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                  <svg width="30" height="30" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.252 23.5016C16.238 24.2046 16.8045 24.7817 17.5076 24.7807C18.2104 24.7797 18.7752 24.2014 18.7595 23.4988L18.5852 15.6725C18.572 15.0803 18.0878 14.6074 17.4954 14.6082C16.9034 14.6091 16.4206 15.083 16.4088 15.6749L16.252 23.5016Z" fill="#b45309"/>
                    <path d="M18.5227 10.6672C18.2354 10.3675 17.891 10.2179 17.4894 10.2185C17.2247 10.2188 16.9843 10.2872 16.7682 10.4235C16.5478 10.5645 16.3716 10.7524 16.2395 10.9871C16.1031 11.2218 16.035 11.4822 16.0355 11.7682C16.0361 12.1903 16.1822 12.5513 16.4739 12.851C16.7612 13.1507 17.1012 13.3003 17.4939 13.2997C17.8955 13.2992 18.2394 13.1486 18.5258 12.848C18.8078 12.5475 18.9485 12.1861 18.9479 11.764C18.9473 11.3326 18.8055 10.9669 18.5227 10.6672Z" fill="#b45309"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M2.93772 17.5207C2.92608 9.47815 9.43639 2.94897 17.4789 2.93733C25.5214 2.92569 32.0506 9.436 32.0622 17.4785C32.0739 25.521 25.5636 32.0502 17.5211 32.0618C9.47854 32.0735 2.94936 25.5632 2.93772 17.5207ZM5.12206 17.5175C5.11216 10.6814 10.6459 5.13156 17.4821 5.12166C24.3182 5.11177 29.868 10.6455 29.8779 17.4817C29.8878 24.3178 24.354 29.8676 17.5179 29.8775C10.6818 29.8874 5.13195 24.3536 5.12206 17.5175Z" fill="#b45309"/>
                  </svg>
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
                          className="sd-dashboard-student-notes"
                          rows="3"
                          maxLength="500"
                          placeholder="e.g., Help reviewing my DevOps resume, backend engineering roadmaps, or interview prep advice..."
                          value={studentNotes}
                          onChange={(e) => setStudentNotes(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#f9fafb",
                            fontSize: "0.875rem",
                            color: "#111827",
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
                      <button
                        className="sd-confirm-btn"
                        onClick={handleBook}
                        disabled={booking || !selectedSlotId || selectedSlotUnbookable}
                      >
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
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>💼</span>
                <span><strong>Job Title:</strong> {mentor.job_title || "N/A"}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🏢</span>
                <span><strong>Employer / Company:</strong> {mentor.employer || "N/A"}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🌐</span>
                <span><strong>Focus Industry:</strong> {mentor.industry || "N/A"}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🧑</span>
                <span><strong>Gender:</strong> {mentor.gender || "N/A"}</span>
              </div>

              {mentor.alma_mater && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>🎓</span>
                  <span><strong>Alma Mater:</strong> {mentor.alma_mater}</span>
                </div>
              )}

              {(mentor.linkedin || mentor.linkedin_url) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0077b5" style={{ flexShrink: 0 }}>
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
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