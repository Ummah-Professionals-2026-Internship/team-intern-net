import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MentorRequests.css";
import "/src/components/admin_styling/ApplicantDetails.css";
import api from "../../api/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SERVICE_LABELS = {
  mock_interview: "Mock Interview",
  resume_review: "Resume Review",
  career_advice: "Career Advice",
  healthcare_service: "Healthcare Service",
  mentorship_program: "Mentorship Program",
};

const GENDER_LABELS = {
  m: "Brother",
  f: "Sister",
};

const EDUCATION_LABELS = {
  high_school: "High School",
  undergraduate: "Undergraduate",
  graduate: "Graduate",
};

const ACADEMIC_STANDING_LABELS = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
};

export default function MentorRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [successAction, setSuccessAction] = useState(null); // "accepted" | "declined"
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const res = await api.get("/mentor/requests");
        const found = res.data.find((r) => r.id === parseInt(id));
        if (!found) setError("Request not found.");
        else setRequest(found);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load request.");
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
      await api.patch(`/mentor/requests/${id}/accept`);
      setRequest((prev) => ({ ...prev, status: "active" }));
      setShowModal(false);
      setSuccessAction("accepted");
    } catch (err) {
      setActionError(err.response?.data?.detail || "Failed to accept request.");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    setActionError("");
    try {
      await api.patch(`/mentor/requests/${id}/decline`);
      setRequest((prev) => ({ ...prev, status: "declined" }));
      setShowDeclineModal(false);
      setSuccessAction("declined");
    } catch (err) {
      setActionError(err.response?.data?.detail || "Failed to decline request.");
    } finally {
      setDeclining(false);
    }
  };

  if (successAction) {
    return (
      <div className="mrq-page">
        {/* Keep the page visible behind */}
        <div className="mrq-modal-overlay">
          <div className="mrq-modal">
            <div className={`mrq-success-icon ${successAction === "accepted" ? "mrq-success-icon--green" : "mrq-success-icon--red"}`}>
              {successAction === "accepted" ? "✓" : "✕"}
            </div>
            <h2 className="mrq-modal-title">
              {successAction === "accepted" ? "Assignment Accepted" : "Assignment Declined"}
            </h2>
            <p className="mrq-modal-subtitle">
              {successAction === "accepted"
                ? "You have successfully accepted this mentorship request. The applicant will be notified."
                : "You have declined this mentorship request. It will be sent back to the admin for reassignment."}
            </p>
            <div className="mrq-modal-btns">
              <button className="mrq-btn-cancel" onClick={() => navigate("/mentor/requests")}>
                Back to Requests
              </button>
              <button className="mrq-btn-accept-confirm" onClick={() => navigate("/mentor")}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const student = request?.student;
  const intake = request?.intake_form;
  const isPending = request?.status === "pending";

  // --- Resume Helpers (ported from ApplicantDetails.jsx) ---
  const rawResumePath = intake?.resume_url || student?.resume_url;

  const getFullResumeUrl = (path) => {
    if (!path) return null;
    const normalized = path.replace(/\\/g, "/");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }
    const cleanBase = API_BASE_URL.replace(/\/+$/, "");
    const cleanPath = normalized.startsWith("/") ? normalized.slice(1) : normalized;
    return `${cleanBase}/${cleanPath}`;
  };

  const finalResumeUrl = getFullResumeUrl(rawResumePath);
  const displayResumeName =
    intake?.resume_name ||
    (rawResumePath ? rawResumePath.split(/[\/\\]/).pop() : "No File Uploaded");
  const displayName = student?.user?.full_name || "Applicant";

  const isPdf = Boolean(finalResumeUrl?.toLowerCase().endsWith(".pdf"));
  const isWordDoc = Boolean(
    finalResumeUrl &&
      (finalResumeUrl.toLowerCase().endsWith(".doc") ||
        finalResumeUrl.toLowerCase().endsWith(".docx"))
  );

  const isLocalhost = Boolean(
    API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1")
  );

  const frameSourceUrl = isPdf
    ? finalResumeUrl
    : isWordDoc && !isLocalhost
    ? `https://docs.google.com/gview?url=${encodeURIComponent(finalResumeUrl)}&embedded=true`
    : null;

  const handleOpenNewTab = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!finalResumeUrl) return;

    if (isPdf) {
      const newTab = window.open("about:blank", "_blank");
      if (newTab) {
        newTab.opener = null;
        newTab.location.href = finalResumeUrl;
      } else {
        alert("Popup blocked! Please allow popups for this site to view the resume.");
      }
    } else if (isWordDoc && !isLocalhost) {
      const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        finalResumeUrl
      )}`;
      const newTab = window.open("about:blank", "_blank");
      if (newTab) {
        newTab.location.href = officeUrl;
      } else {
        alert("Popup blocked! Please allow popups for this site to view the resume.");
      }
    } else {
      const link = document.createElement("a");
      link.href = finalResumeUrl;
      link.setAttribute("download", displayResumeName || "resume");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="mrq-page">
      {/* Back link */}
      <button className="mrq-back" onClick={() => navigate("/mentor/requests")}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5303 8.53033C13.8232 8.23744 13.8232 7.76256 13.5303 7.46967C13.2374 7.17678 12.7626 7.17678 12.4697 7.46967L9.88388 10.0555C8.80994 11.1294 8.80994 12.8706 9.88389 13.9445L12.4697 16.5303C12.7626 16.8232 13.2374 16.8232 13.5303 16.5303C13.8232 16.2374 13.8232 15.7626 13.5303 15.4697L10.9445 12.8839C10.4564 12.3957 10.4564 11.6043 10.9445 11.1161L13.5303 8.53033Z" fill="#007CA6"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.26154 2 6.3923 2 5 2.80385C4.08788 3.33046 3.33046 4.08788 2.80385 5C2 6.3923 2 8.26154 2 12C2 15.7385 2 17.6077 2.80385 19C3.33046 19.9121 4.08788 20.6695 5 21.1962C6.3923 22 8.26154 22 12 22C15.7385 22 17.6077 22 19 21.1962C19.9121 20.6695 20.6695 19.9121 21.1962 19C22 17.6077 22 15.7385 22 12C22 8.26154 22 6.39231 21.1962 5C20.6695 4.08789 19.9121 3.33046 19 2.80385C17.6077 2 15.7385 2 12 2ZM18.25 19.8971C17.8202 20.1453 17.249 20.3146 16.2444 20.4056C15.2192 20.4986 13.8968 20.5 12 20.5C10.1032 20.5 8.78082 20.4986 7.75558 20.4056C6.75097 20.3146 6.1798 20.1453 5.75 19.8971C5.06591 19.5022 4.49784 18.9341 4.10288 18.25C3.85474 17.8202 3.68541 17.249 3.59436 16.2444C3.50144 15.2192 3.5 13.8968 3.5 12C3.5 10.1032 3.50144 8.78082 3.59436 7.75558C3.68541 6.75097 3.85474 6.1798 4.10288 5.75C4.49784 5.06591 5.06591 4.49784 5.75 4.10289C6.1798 3.85474 6.75097 3.68541 7.75559 3.59436C8.78082 3.50144 10.1032 3.5 12 3.5C13.8968 3.5 15.2192 3.50144 16.2444 3.59436C17.249 3.68541 17.8202 3.85474 18.25 4.10289C18.9341 4.49784 19.5022 5.06591 19.8971 5.75C20.1453 6.1798 20.3146 6.75097 20.4056 7.75559C20.4986 8.78082 20.5 10.1032 20.5 12C20.5 13.8968 20.4986 15.2192 20.4056 16.2444C20.3146 17.249 20.1453 17.8202 19.8971 18.25C19.5022 18.9341 18.9341 19.5022 18.25 19.8971Z" fill="#007CA6"/>
        </svg>
        back to requests
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
          <svg width="45" height="42" viewBox="0 0 45 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.5 0.5C34.6915 0.5 44.4998 9.55861 44.5 20.6445C44.5 31.7306 34.6916 40.79 22.5 40.79C10.3084 40.79 0.5 31.7306 0.5 20.6445C0.500194 9.55861 10.3085 0.5 22.5 0.5Z" stroke="black" strokeOpacity="0.25" />
            <g transform="translate(8.5 6)">
              <path
                d="M14 15C12.7167 15 11.618 14.5104 10.7042 13.5312C9.79027 12.5521 9.33332 11.375 9.33332 10C9.33332 8.625 9.79027 7.44792 10.7042 6.46875C11.618 5.48958 12.7167 5 14 5C15.2833 5 16.3819 5.48958 17.2958 6.46875C18.2097 7.44792 18.6667 8.625 18.6667 10C18.6667 11.375 18.2097 12.5521 17.2958 13.5312C16.3819 14.5104 15.2833 15 14 15ZM4.66666 25V21.5C4.66666 20.7917 4.8368 20.1406 5.17707 19.5469C5.51735 18.9531 5.96943 18.5 6.53332 18.1875C7.73888 17.5417 8.96388 17.0573 10.2083 16.7344C11.4528 16.4115 12.7167 16.25 14 16.25C15.2833 16.25 16.5472 16.4115 17.7917 16.7344C19.0361 17.0573 20.2611 17.5417 21.4667 18.1875C22.0305 18.5 22.4826 18.9531 22.8229 19.5469C23.1632 20.1406 23.3333 20.7917 23.3333 21.5V25H4.66666ZM6.99999 22.5H21V21.5C21 21.2708 20.9465 21.0625 20.8396 20.875C20.7326 20.6875 20.5917 20.5417 20.4167 20.4375C19.3667 19.875 18.3069 19.4531 17.2375 19.1719C16.168 18.8906 15.0889 18.75 14 18.75C12.9111 18.75 11.8319 18.8906 10.7625 19.1719C9.69305 19.4531 8.63332 19.875 7.58332 20.4375C7.40832 20.5417 7.26735 20.6875 7.16041 20.875C7.05346 21.0625 6.99999 21.2708 6.99999 21.5V22.5ZM14 12.5C14.6417 12.5 15.191 12.2552 15.6479 11.7656C16.1049 11.276 16.3333 10.6875 16.3333 10C16.3333 9.3125 16.1049 8.72396 15.6479 8.23438C15.191 7.74479 14.6417 7.5 14 7.5C13.3583 7.5 12.809 7.74479 12.3521 8.23438C11.8951 8.72396 11.6667 9.3125 11.6667 10C11.6667 10.6875 11.8951 11.276 12.3521 11.7656C12.809 12.2552 13.3583 12.5 14 12.5Z"
                fill="#1D1B20"
              />
            </g>
          </svg>
          <h2>Applicant Information</h2>
        </div>
        <div className="mrq-info-grid">
          <InfoField label="Name" value={student?.user?.full_name} />
          <InfoField label="Major" value={student?.major || intake?.major} />
          <InfoField label="Email" value={student?.user?.email} />
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
          <svg width="45" height="42" viewBox="0 0 45 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.5 0.5C34.6915 0.5 44.4998 9.55861 44.5 20.6445C44.5 31.7306 34.6916 40.79 22.5 40.79C10.3084 40.79 0.5 31.7306 0.5 20.6445C0.500194 9.55861 10.3085 0.5 22.5 0.5Z" stroke="black" strokeOpacity="0.25" />
            <g transform="translate(8.5 6)">
              <path d="M8.52963 22.022L4.93811 25.0411C4.81056 25.1483 4.65505 25.2169 4.48986 25.2388C4.32467 25.2606 4.15668 25.2349 4.00563 25.1645C3.85458 25.0942 3.72676 24.9822 3.6372 24.8416C3.54764 24.7011 3.50006 24.538 3.50006 24.3713V7C3.50006 6.76794 3.59225 6.54538 3.75634 6.38128C3.92044 6.21719 4.143 6.125 4.37506 6.125H23.6251C23.8571 6.125 24.0797 6.21719 24.2438 6.38128C24.4079 6.54538 24.5001 6.76794 24.5001 7V21C24.5001 21.2321 24.4079 21.4546 24.2438 21.6187C24.0797 21.7828 23.8571 21.875 23.6251 21.875H8.93282L8.52963 22.022Z" stroke="#1D2026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5001 12.25H17.5001" stroke="#1D2026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5001 15.75H17.5001" stroke="#1D2026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
          <h2>Comments / Goals</h2>
        </div>
        <div className="mrq-comments">
          {intake?.comments || <span className="mrq-empty">No comments provided.</span>}
        </div>
      </div>

      {/* Resume */}
      <div className="mrq-section">
        <div className="mrq-section-title">
          <svg width="45" height="42" viewBox="0 0 45 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.5 0.5C34.6915 0.5 44.4998 9.55861 44.5 20.6445C44.5 31.7306 34.6916 40.79 22.5 40.79C10.3084 40.79 0.5 31.7306 0.5 20.6445C0.500194 9.55861 10.3085 0.5 22.5 0.5Z" stroke="black" strokeOpacity="0.25" />
            <g transform="translate(8 8)">
              <path d="M18.8742 6.625L7.48445 16.5497C7.07422 16.9014 6.84375 17.3783 6.84375 17.8756C6.84375 18.3729 7.07422 18.8498 7.48445 19.2014C7.89469 19.553 8.45109 19.7506 9.03125 19.7506C9.61141 19.7506 10.1678 19.553 10.578 19.2014L24.1553 7.40165C24.5616 7.05343 24.8838 6.64003 25.1037 6.18506C25.3235 5.73009 25.4367 5.24246 25.4367 4.75C25.4367 4.25754 25.3235 3.76991 25.1037 3.31494C24.8838 2.85997 24.5615 2.44657 24.1553 2.09835C23.749 1.75013 23.2667 1.47391 22.7359 1.28545C22.2051 1.097 21.6362 1 21.0617 1C20.4872 1 19.9183 1.097 19.3875 1.28545C18.8567 1.47391 18.3744 1.75013 17.9681 2.09835L4.39086 13.8981C3.16015 14.953 2.46875 16.3837 2.46875 17.8756C2.46875 19.3674 3.16015 20.7982 4.39086 21.853C5.62157 22.9079 7.29077 23.5006 9.03125 23.5006C10.7717 23.5006 12.4409 22.9079 13.6716 21.853L24.8898 12.25" stroke="#1D2026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
           </g>
          </svg>
          <h2>Resume</h2>
        </div>
        <div className="mrq-resume">
          {finalResumeUrl ? (
            <button
              type="button"
              className="mrq-resume-link"
              onClick={() => setShowPreviewModal(true)}
            >
              view resume
            </button>
          ) : (
            <button className="mrq-resume-link" disabled>
              view resume
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="mrq-actions">
          <button className="mrq-btn-decline" onClick={() => { setShowDeclineModal(true); setActionError(""); }}>
            Decline Assignment
          </button>
          <button className="mrq-btn-accept" onClick={() => { setShowModal(true); setActionError(""); }}>
            Accept Assignment
          </button>
        </div>
      )}

      {showDeclineModal && (
        <div className="mrq-modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="mrq-modal" onClick={(e) => e.stopPropagation()}>
            <svg width="97" height="97" viewBox="0 0 97 97" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48.5" cy="48.5" r="48" fill="#FF383C" fillOpacity="0.2" stroke="#FF383C"/>
              <path d="M48.5 41.4688V26.2344C48.5 24.6804 49.1173 23.19 50.2162 22.0912C51.315 20.9923 52.8054 20.375 54.3594 20.375C55.9134 20.375 57.4037 20.9923 58.5026 22.0912C59.6014 23.19 60.2187 24.6804 60.2188 26.2344V49.6719" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M36.7812 43.8125V21.5469C36.7812 19.9929 37.3986 18.5025 38.4974 17.4037C39.5963 16.3048 41.0866 15.6875 42.6406 15.6875C44.1946 15.6875 45.685 16.3048 46.7838 17.4037C47.8827 18.5025 48.5 19.9929 48.5 21.5469V41.4688" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M48.5 61.3906C48.5 58.2826 49.7347 55.3019 51.9323 53.1042C54.13 50.9065 57.1107 49.6719 60.2188 49.6719V43.8125C60.2188 42.2585 60.8361 40.7681 61.9349 39.6693C63.0338 38.5705 64.5241 37.9531 66.0781 37.9531C67.6321 37.9531 69.1225 38.5705 70.2213 39.6693C71.3202 40.7681 71.9375 42.2585 71.9375 43.8125V55.5312C71.9375 61.7473 69.4682 67.7087 65.0728 72.1041C60.6774 76.4994 54.716 78.9688 48.5 78.9688C42.284 78.9688 36.3226 76.4994 31.9272 72.1041C27.5318 67.7087 25.0625 61.7473 25.0625 55.5312V33.2656C25.0625 31.7116 25.6798 30.2213 26.7787 29.1224C27.8775 28.0236 29.3679 27.4062 30.9219 27.4062C32.4759 27.4062 33.9662 28.0236 35.0651 29.1224C36.1639 30.2213 36.7812 31.7116 36.7812 33.2656V43.8125" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="mrq-modal-title">Decline Assignment?</h2>
            <p className="mrq-modal-subtitle">You are about to decline this mentorship request.</p>

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

            <div className="mrq-modal-notice mrq-modal-notice--warning">
              <span>ⓘ</span>
              Once declined, this request will be sent back to the admin for reassignment.
            </div>

            {actionError && <p className="mrq-modal-error">{actionError}</p>}

            <div className="mrq-modal-btns">
              <button className="mrq-btn-cancel" onClick={() => setShowDeclineModal(false)}>
                Cancel
              </button>
              <button className="mrq-btn-decline-confirm" onClick={handleDecline} disabled={declining}>
                {declining ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept confirmation modal */}
      {showModal && (
        <div className="mrq-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mrq-modal" onClick={(e) => e.stopPropagation()}>
            <svg width="97" height="97" viewBox="0 0 97 97" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48.5" cy="48.5" r="48" fill="#8ACBDB" fillOpacity="0.2" stroke="#007CA6"/>
              <path d="M48.5 41.4688V26.2344C48.5 24.6804 49.1173 23.19 50.2162 22.0912C51.315 20.9923 52.8054 20.375 54.3594 20.375C55.9134 20.375 57.4037 20.9923 58.5026 22.0912C59.6014 23.19 60.2187 24.6804 60.2188 26.2344V49.6719" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M36.7812 43.8125V21.5469C36.7812 19.9929 37.3986 18.5025 38.4974 17.4037C39.5963 16.3048 41.0866 15.6875 42.6406 15.6875C44.1946 15.6875 45.685 16.3048 46.7838 17.4037C47.8827 18.5025 48.5 19.9929 48.5 21.5469V41.4688" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M48.5 61.3906C48.5 58.2826 49.7347 55.3019 51.9323 53.1042C54.13 50.9065 57.1107 49.6719 60.2188 49.6719V43.8125C60.2188 42.2585 60.8361 40.7681 61.9349 39.6693C63.0338 38.5705 64.5241 37.9531 66.0781 37.9531C67.6321 37.9531 69.1225 38.5705 70.2213 39.6693C71.3202 40.7681 71.9375 42.2585 71.9375 43.8125V55.5312C71.9375 61.7473 69.4682 67.7087 65.0728 72.1041C60.6774 76.4994 54.716 78.9688 48.5 78.9688C42.284 78.9688 36.3226 76.4994 31.9272 72.1041C27.5318 67.7087 25.0625 61.7473 25.0625 55.5312V33.2656C25.0625 31.7116 25.6798 30.2213 26.7787 29.1224C27.8775 28.0236 29.3679 27.4062 30.9219 27.4062C32.4759 27.4062 33.9662 28.0236 35.0651 29.1224C36.1639 30.2213 36.7812 31.7116 36.7812 33.2656V43.8125" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
              <button className="mrq-btn-accept-confirm" onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Preview Modal (ported from ApplicantDetails.jsx) */}
      {showPreviewModal && (
        <div className="resume-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="resume-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="resume-modal-header">
              <h3>{displayResumeName}</h3>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-secondary modal-download-btn"
                  onClick={handleOpenNewTab}
                >
                  {isPdf ? "Open in New Tab" : "Download File"}
                </button>
                <button
                  type="button"
                  className="close-modal-btn"
                  onClick={() => setShowPreviewModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="resume-modal-body">
              {frameSourceUrl ? (
                <iframe
                  src={frameSourceUrl}
                  title={`Resume Preview - ${displayName}`}
                  className="resume-iframe"
                />
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ marginBottom: "16px", color: "#64748b" }}>
                    In-browser iframe preview for Word documents (<code>.docx</code>) requires a public production domain.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleOpenNewTab}
                  >
                    Download File
                  </button>
                </div>
              )}
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