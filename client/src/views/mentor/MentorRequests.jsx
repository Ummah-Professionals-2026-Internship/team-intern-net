import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MentorRequests.css";
import api from "../../api/api";

const STATUS_LABELS = {
  pending:   { label: "Pending",   className: "mrq-badge--pending" },
  active:    { label: "Active",    className: "mrq-badge--active" },
  declined:  { label: "Declined",  className: "mrq-badge--declined" },
  completed: { label: "Completed", className: "mrq-badge--completed" },
  cancelled: { label: "Cancelled", className: "mrq-badge--cancelled" },
};

const SERVICE_LABELS = {
  mock_interview:      "Mock Interview",
  resume_review:       "Resume Review",
  career_advice:       "Career Advice",
  healthcare_service:  "Healthcare Service",
  mentorship_program:  "Mentorship Program",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function MentorRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await api.get("/mentor/requests");
        setRequests(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  return (
    <div className="mrq-page">
      <div className="mrq-header">
        <h1 className="mrq-title">Application Requests</h1>
        <p className="mrq-subtitle">Review and respond to mentorship requests assigned to you.</p>
      </div>

      <div className="mrq-card">
        {loading ? (
          <div className="mrq-state">
            <div className="mrq-spinner" />
            <p>Loading requests...</p>
          </div>
        ) : error ? (
          <div className="mrq-state mrq-state--error">{error}</div>
        ) : requests.length === 0 ? (
          <div className="mrq-state">No requests assigned to you yet.</div>
        ) : (
          <table className="mrq-table">
            <thead>
              <tr>
                <th className="mrq-th">Applicant</th>
                <th className="mrq-th">Service Requested</th>
                <th className="mrq-th">Desired Career</th>
                <th className="mrq-th">Status</th>
                <th className="mrq-th">Date Assigned</th>
                <th className="mrq-th mrq-th--right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const badge  = STATUS_LABELS[req.status] || { label: req.status, className: "" };
                const name   = req.student?.user?.full_name || "—";
                const service = SERVICE_LABELS[req.intake_form?.service_type] || req.intake_form?.service_type || "—";
                const career = req.intake_form?.desired_career || "—";
                return (
                  <tr key={req.id} className="mrq-row">
                    <td className="mrq-td mrq-td--name">{name}</td>
                    <td className="mrq-td">{service}</td>
                    <td className="mrq-td">{career}</td>
                    <td className="mrq-td">
                      <span className={`mrq-badge ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td className="mrq-td">{formatDate(req.assigned_at)}</td>
                    <td className="mrq-td mrq-td--action">
                      <button
                        className="mrq-btn-view"
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