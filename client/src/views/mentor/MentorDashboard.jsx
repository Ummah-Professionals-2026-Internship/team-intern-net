import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MentorDashboard.css";

const SERVICE_LABELS = {
  mock_interview:     "Mock Interview",
  resume_review:      "Resume Review",
  career_advice:      "Career Advice",
  healthcare_service: "Healthcare Service",
  mentorship_program: "Mentorship Program",
};

const STATUS_LABELS = {
  pending:   { label: "Pending",   className: "mdb-badge--pending" },
  active:    { label: "Active",    className: "mdb-badge--active" },
  declined:  { label: "Declined",  className: "mdb-badge--declined" },
  completed: { label: "Completed", className: "mdb-badge--completed" },
  cancelled: { label: "Cancelled", className: "mdb-badge--cancelled" },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function MentorDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Derived counts
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const activeCount  = requests.filter((r) => r.status === "active").length;

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res  = await fetch("http://localhost:8000/mentors/requests");
        const data = await res.json();
        if (!res.ok) setError(data.detail || "Failed to load data.");
        else setRequests(data);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Mentor name placeholder — replace with auth context later
  const mentorName = "Mentor";
  const currentMentee = requests.find((req) => req.status === "active");
  return (
    <div className="mdb-page">
      {/* Welcome */}
      <h1 className="mdb-welcome">Welcome Back, {mentorName}!</h1>

      {/* Stat cards */}
      <div className="mdb-stats">
        <StatCard
          value={loading ? "—" : pendingCount}
          label="Pending Requests"
          action="Review"
          onAction={() => navigate("/mentor/requests")}
        />
        <StatCard
          value={loading ? "—" : activeCount}
          label="Current Mentee"
          action="View"
          onAction={() => currentMentee?.id ? navigate(`/mentor/requests/${currentMentee.id}`) : navigate("/mentor/requests")}
        />
        <StatCard
          label="Availability"
          description="Manage your available time slots"
          action="Update Availability"
          onAction={() => navigate("/mentor/availability")}
        />
        <StatCard
          label="Profile"
          description="Keep your profile up to date"
          action="Edit Profile"
          onAction={() => navigate("/mentor/profile")}
        />
      </div>

      {/* Upcoming Meetings */}
      <div className="mdb-section">
        <div className="mdb-section-header">
            <svg className="mdb-section-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 14.1772C8.88366 14.1772 9.6 13.4518 9.6 12.557C9.6 11.6621 8.88366 10.9367 8 10.9367C7.11634 10.9367 6.4 11.6621 6.4 12.557C6.4 13.4518 7.11634 14.1772 8 14.1772Z" fill="#007CA6"/>
                <path d="M17.6 12.557C17.6 13.4518 16.8837 14.1772 16 14.1772C15.1163 14.1772 14.4 13.4518 14.4 12.557C14.4 11.6621 15.1163 10.9367 16 10.9367C16.8837 10.9367 17.6 11.6621 17.6 12.557Z" fill="#007CA6"/>
                <path d="M24 14.1772C24.8837 14.1772 25.6 13.4518 25.6 12.557C25.6 11.6621 24.8837 10.9367 24 10.9367C23.1163 10.9367 22.4 11.6621 22.4 12.557C22.4 13.4518 23.1163 14.1772 24 14.1772Z" fill="#007CA6"/>
                <path d="M9.6 18.2278C9.6 19.1227 8.88366 19.8481 8 19.8481C7.11634 19.8481 6.4 19.1227 6.4 18.2278C6.4 17.333 7.11634 16.6076 8 16.6076C8.88366 16.6076 9.6 17.333 9.6 18.2278Z" fill="#007CA6"/>
                <path d="M16 19.8481C16.8837 19.8481 17.6 19.1227 17.6 18.2278C17.6 17.333 16.8837 16.6076 16 16.6076C15.1163 16.6076 14.4 17.333 14.4 18.2278C14.4 19.1227 15.1163 19.8481 16 19.8481Z" fill="#007CA6"/>
                <path d="M25.6 18.2278C25.6 19.1227 24.8837 19.8481 24 19.8481C23.1163 19.8481 22.4 19.1227 22.4 18.2278C22.4 17.333 23.1163 16.6076 24 16.6076C24.8837 16.6076 25.6 17.333 25.6 18.2278Z" fill="#007CA6"/>
                <path d="M8 25.519C8.88366 25.519 9.6 24.7936 9.6 23.8987C9.6 23.0039 8.88366 22.2785 8 22.2785C7.11634 22.2785 6.4 23.0039 6.4 23.8987C6.4 24.7936 7.11634 25.519 8 25.519Z" fill="#007CA6"/>
                <path d="M17.6 23.8987C17.6 24.7936 16.8837 25.519 16 25.519C15.1163 25.519 14.4 24.7936 14.4 23.8987C14.4 23.0039 15.1163 22.2785 16 22.2785C16.8837 22.2785 17.6 23.0039 17.6 23.8987Z" fill="#007CA6"/>
                <path d="M24 25.519C24.8837 25.519 25.6 24.7936 25.6 23.8987C25.6 23.0039 24.8837 22.2785 24 22.2785C23.1163 22.2785 22.4 23.0039 22.4 23.8987C22.4 24.7936 23.1163 25.519 24 25.519Z" fill="#007CA6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M9.2 1.21519C9.2 0.544059 8.66274 0 8 0C7.33726 0 6.8 0.544059 6.8 1.21519H6.4C2.86538 1.21519 0 4.11684 0 7.6962V25.519C0 29.0984 2.86538 32 6.4 32H25.6C29.1346 32 32 29.0984 32 25.519V7.6962C32 4.11684 29.1346 1.21519 25.6 1.21519H25.2C25.2 0.544059 24.6627 0 24 0C23.3373 0 22.8 0.544059 22.8 1.21519H9.2ZM22.8 6.07595V3.64557H9.2V6.07595C9.2 6.74708 8.66274 7.29114 8 7.29114C7.33726 7.29114 6.8 6.74708 6.8 6.07595V3.64557H6.4C4.19086 3.64557 2.4 5.4591 2.4 7.6962V25.519C2.4 27.7561 4.19086 29.5696 6.4 29.5696H25.6C27.8091 29.5696 29.6 27.7561 29.6 25.519V7.6962C29.6 5.4591 27.8091 3.64557 25.6 3.64557H25.2V6.07595C25.2 6.74708 24.6627 7.29114 24 7.29114C23.3373 7.29114 22.8 6.74708 22.8 6.07595Z" fill="#007CA6"/>
            </svg>
          <h2 className="mdb-section-title">Upcoming Meetings</h2>
        </div>
        <table className="mdb-table">
          <thead>
            <tr>
              <th className="mdb-th">Applicant</th>
              <th className="mdb-th">Service</th>
              <th className="mdb-th">Date</th>
              <th className="mdb-th">Time</th>
              <th className="mdb-th">Details</th>
              {/* <th className="mdb-th">Meeting Link</th> */}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mdb-td mdb-td--empty" colSpan={6}>
                No upcoming meetings.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Application Requests */}
      <div className="mdb-section">
        <div className="mdb-section-header">
            <svg className="mdb-section-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" fill="white"/>
                <path d="M28 26.6666C28 24.3444 25.7738 22.3689 22.6667 21.6367M20 26.6667C20 23.7212 16.4183 21.3334 12 21.3334C7.58172 21.3334 4 23.7212 4 26.6667M20 17.3334C22.9455 17.3334 25.3333 14.9455 25.3333 12C25.3333 9.0545 22.9455 6.66669 20 6.66669M12 17.3334C9.05448 17.3334 6.66667 14.9455 6.66667 12C6.66667 9.0545 9.05448 6.66669 12 6.66669C14.9455 6.66669 17.3333 9.0545 17.3333 12C17.3333 14.9455 14.9455 17.3334 12 17.3334Z" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          <h2 className="mdb-section-title">Application Requests</h2>
        </div>

        {loading ? (
          <div className="mdb-loading">
            <div className="mdb-spinner" />
          </div>
        ) : error ? (
          <p className="mdb-error">{error}</p>
        ) : requests.length === 0 ? (
          <p className="mdb-empty">No requests assigned to you yet.</p>
        ) : (
          <table className="mdb-table">
            <thead>
              <tr>
                <th className="mdb-th">Applicant</th>
                <th className="mdb-th">Service Requested</th>
                <th className="mdb-th">Desired Career</th>
                <th className="mdb-th">Status</th>
                <th className="mdb-th">Date Assigned</th>
                <th className="mdb-th mdb-th--right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const badge   = STATUS_LABELS[req.status] || { label: req.status, className: "" };
                const name    = req.student?.user?.full_name || "—";
                const service = SERVICE_LABELS[req.intake_form?.service_type] || "—";
                const career  = req.intake_form?.desired_career || "—";
                return (
                  <tr key={req.id} className="mdb-row">
                    <td className="mdb-td mdb-td--name">{name}</td>
                    <td className="mdb-td">{service}</td>
                    <td className="mdb-td">{career}</td>
                    <td className="mdb-td">
                      <span className={`mdb-badge ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td className="mdb-td">{formatDate(req.assigned_at)}</td>
                    <td className="mdb-td mdb-td--action">
                      <button
                        className="mdb-btn-view"
                        onClick={() => navigate(`/mentor/requests/${req.id}`)}
                      >
                        View Request
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

function StatCard({ value, label, description, action, onAction }) {
  return (
    <div className="mdb-stat-card">
      {value !== undefined && (
        <span className="mdb-stat-value">{value}</span>
      )}
      <span className="mdb-stat-label">{label}</span>
      {description && (
        <span className="mdb-stat-description">{description}</span>
      )}
      <button className="mdb-stat-action" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}