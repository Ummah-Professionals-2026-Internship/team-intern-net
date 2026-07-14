import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MentorRequests.css";

const SERVICE_LABELS = {
  mock_interview:      "Mock Interview",
  resume_review:       "Resume Review",
  career_advice:       "Career Advice",
  healthcare_service:  "Healthcare Service",
  mentorship_program:  "Mentorship Program",
};

const GENDER_LABELS = {
  m: "Brother",
  f: "Sister",
};

const EDUCATION_LABELS = {
  high_school:    "High School",
  undergraduate:  "Undergraduate",
  graduate:       "Graduate",
};

const ACADEMIC_STANDING_LABELS = {
  freshman:  "Freshman",
  sophomore: "Sophomore",
  junior:    "Junior",
  senior:    "Senior",
};

export default function MentorRequestDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [request, setRequest]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [accepting, setAccepting]   = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const res  = await fetch("http://localhost:8000/mentors/requests");
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Failed to load request.");
        } else {
          const found = data.find((r) => r.id === parseInt(id));
          if (!found) setError("Request not found.");
          else setRequest(found);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  const handleAccept = async () => {
    setAccepting(true);
    setActionError("");
    try {
      const res  = await fetch(`http://localhost:8000/mentors/requests/${id}/accept`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.detail || "Failed to accept request.");
      } else {
        setRequest((prev) => ({ ...prev, status: "active" }));
        setShowModal(false);
        navigate("/mentor/requests");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="mrq-page">
        <div className="mrq-state"><div className="mrq-spinner" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mrq-page">
        <div className="mrq-state mrq-state--error">{error}</div>
      </div>
    );
  }

  const student  = request?.student;
  const intake   = request?.intake_form;
  const isPending = request?.status === "pending";

  return (
    <div className="mrq-page">
      {/* Back link */}
      <button className="mrq-back" onClick={() => navigate("/mentor/requests")}>
        &#8249; back to requests
      </button>

      <div className="mrq-detail-header">
        <h1 className="mrq-title">Review Applicant Request</h1>
        <p className="mrq-subtitle">
          Please review the applicant details below and decide whether you'd like to accept or decline this assignment.
        </p>
      </div>

      {/* Applicant Information */}
      <div className="mrq-section">
        <div className="mrq-section-title">
          {/* <span className="mrq-section-icon">👤</span> */}
          <h2>Applicant Information</h2>
        </div>
        <div className="mrq-info-grid">
          <InfoField label="Name"           value={student?.user?.full_name} />
          <InfoField label="Major"          value={student?.major || intake?.major} />
          <InfoField label="Email"          value={student?.user?.email} />
          <InfoField label="Desired Career" value={intake?.desired_career} />
          <InfoField
            label="Gender"
            value={GENDER_LABELS[student?.user?.gender] || "—"}
          />
          <InfoField
            label="Service Requested"
            value={SERVICE_LABELS[intake?.service_type] || intake?.service_type}
          />
          <InfoField
            label="Academic Level"
            value={[
              EDUCATION_LABELS[student?.education_level],
              ACADEMIC_STANDING_LABELS[student?.academic_standing],
            ].filter(Boolean).join(" — ") || "—"}
          />
        </div>
      </div>

      {/* Comments / Goals */}
      <div className="mrq-section">
        <div className="mrq-section-title">
          {/* <span className="mrq-section-icon">💬</span> */}
          <h2>Comments / Goals</h2>
        </div>
        <div className="mrq-comments">
          {intake?.comments || <span className="mrq-empty">No comments provided.</span>}
        </div>
      </div>

      {/* Resume */}
      <div className="mrq-section">
        <div className="mrq-section-title">
          {/* <span className="mrq-section-icon">📎</span> */}
          <h2>Resume</h2>
        </div>
        <div className="mrq-resume">
          <button className="mrq-resume-link" disabled>
            view resume
          </button>
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="mrq-actions">
          <button className="mrq-btn-decline" disabled>
            Decline Assignment
          </button>
          <button className="mrq-btn-accept" onClick={() => setShowModal(true)}>
            Accept Assignment
          </button>
        </div>
      )}

      {/* Accept confirmation modal */}
      {showModal && (
        <div className="mrq-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mrq-modal" onClick={(e) => e.stopPropagation()}>
            {/* <div className="mrq-modal-icon">🤚</div> */}
            <h2 className="mrq-modal-title">Accept Assignment?</h2>
            <p className="mrq-modal-subtitle">You are about to accept this mentorship request.</p>

            <div className="mrq-modal-details">
              <div className="mrq-modal-row">
                <span className="mrq-modal-label">Applicant</span>
                <span className="mrq-modal-value">{student?.user?.full_name}</span>
              </div>
              <div className="mrq-modal-row">
                <span className="mrq-modal-label">Service Requested</span>
                <span className="mrq-modal-value">{SERVICE_LABELS[intake?.service_type]}</span>
              </div>
              <div className="mrq-modal-row">
                <span className="mrq-modal-label">Desired Career</span>
                <span className="mrq-modal-value">{intake?.desired_career || "—"}</span>
              </div>
            </div>

            <div className="mrq-modal-notice">
              <span>ⓘ</span>
              Once accepted, the applicant will be notified and this request will be added to your meetings.
            </div>

            {actionError && <p className="mrq-modal-error">{actionError}</p>}

            <div className="mrq-modal-btns">
              <button className="mrq-btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="mrq-btn-accept" onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="mrq-info-field">
      <span className="mrq-info-label">{label}</span>
      <span className="mrq-info-value">{value || "—"}</span>
    </div>
  );
}