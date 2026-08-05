import { useState, useEffect } from "react";
import "./StudentMeetings.css";
import api from "../../api/api";

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone: userTimezone,
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: userTimezone,
  });
}

const STATUS_STYLES = {
  scheduled: { label: "Scheduled", className: "sm-badge--scheduled" },
  completed: { label: "Completed", className: "sm-badge--completed" },
  cancelled: { label: "Cancelled", className: "sm-badge--cancelled" },
  no_show: { label: "No Show", className: "sm-badge--noshow" },
};

export default function StudentMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await api.get("/student/meetings");
        setMeetings(res.data);
      } catch (err) {
        setError("Could not load meetings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  return (
    <div className="sm-page">
      <h1 className="sm-title">My Meetings</h1>
      <p className="sm-subtitle">View all your scheduled and past mentorship sessions.</p>

      {loading && <div className="sm-state">Loading meetings...</div>}
      {error && <div className="sm-state sm-state--error">{error}</div>}
      {!loading && !error && meetings.length === 0 && (
        <div className="sm-state">No meetings scheduled yet.</div>
      )}

      <div className="sm-list">
        {meetings.map((meeting) => {
          const status = STATUS_STYLES[meeting.status] || { label: meeting.status, className: "" };
          return (
            <div key={meeting.id} className="sm-card">
              <div className="sm-card-header">
                <div>
                  <p className="sm-mentor">With {meeting.mentor_name}</p>
                  <p className="sm-date">{formatDate(meeting.start_datetime)}</p>
                  <p className="sm-time">
                    {formatTime(meeting.start_datetime)} — {formatTime(meeting.end_datetime)}
                  </p>
                </div>
                <span className={`sm-badge ${status.className}`}>{status.label}</span>
              </div>
              {meeting.meeting_url && (
                <a href={meeting.meeting_url} target="_blank" rel="noreferrer" className="sm-link">
                  Join Meeting →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}