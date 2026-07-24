import { useState, useEffect } from "react";
import api from "../../api/api";
import "./MentorMeetings.css";

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", className: "mm-badge--scheduled" },
  completed: { label: "Completed", className: "mm-badge--completed" },
  cancelled: { label: "Cancelled", className: "mm-badge--cancelled" },
  no_show:   { label: "No Show",   className: "mm-badge--noshow" },
};

const SERVICE_LABELS = {
  mock_interview:      "Mock Interview",
  resume_review:       "Resume Review",
  career_advice:       "Career Advice",
  healthcare_service:  "Healthcare Service",
  mentorship_program:  "Mentorship Program",
};

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const tzAbbr = new Date().toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop();

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    timeZone: userTimezone,
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: userTimezone,
  });
}

const canJoin = (status) => status === "scheduled";

export default function MentorMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      try {
        const res = await api.get("/mentor/meetings");
        setMeetings(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load meetings.");
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  return (
    <div className="mm-page">
      <div className="mm-header">
        <h1 className="mm-title">Meetings</h1>
        <p className="mm-subtitle">View your upcoming and past mentorship sessions.</p>
      </div>

      <div className="mm-card">
        {loading ? (
          <div className="mm-state">
            <div className="mm-spinner" />
          </div>
        ) : error ? (
          <div className="mm-state mm-state--error">{error}</div>
        ) : meetings.length === 0 ? (
          <div className="mm-state">No meetings scheduled yet.</div>
        ) : (
          <table className="mm-table">
            <thead>
              <tr>
                <th className="mm-th">Applicant</th>
                <th className="mm-th">Service</th>
                <th className="mm-th">Date</th>
                <th className="mm-th">Time ({tzAbbr})</th>
                <th className="mm-th">Status</th>
                <th className="mm-th mm-th--right">Meeting Link</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => {
                const name   = meeting.assignment?.student?.user?.full_name || "—";
                const badge  = STATUS_CONFIG[meeting.status] || { label: meeting.status, className: "" };
                const active = canJoin(meeting.status);

                return (
                  <tr key={meeting.id} className="mm-row">
                    <td className="mm-td mm-td--name">{name}</td>
                    <td className="mm-td">{SERVICE_LABELS[meeting.assignment?.intake_form?.service_type] || "—"}</td>
                    <td className="mm-td">{formatDate(meeting.start_datetime)}</td>
                    <td className="mm-td">{formatTime(meeting.start_datetime)}</td>
                    <td className="mm-td">
                      <span className={`mm-badge ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td className="mm-td mm-td--right">
                      <button
                        className={`mm-btn-join ${!active ? "mm-btn-join--disabled" : ""}`}
                        disabled={!active}
                        // onClick={() => active && meeting.meeting_url && window.open(meeting.meeting_url, "_blank")}
                      >
                        Join Meeting
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}