import { useState, useEffect } from "react";
import api from "../../api/api";
import "../admin_styling/MentorProfile.css";
import "/src/views/mentor/MentorRequests.css";
import Icon from '../ui/Icon';

const SERVICE_LABELS = {
  mock_interview: "Mock Interview",
  resume_review: "Resume Review",
  career_advice: "General Career Advice",
  healthcare_service: "Healthcare Service",
  mentorship_program: "Mentorship Program",
};

function formatService(s) {
  if (!s) return "";
  return SERVICE_LABELS[s] || SERVICE_LABELS[s.toLowerCase()] || s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name) {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function MentorProfile({ mentor: initialMentor, onBack, onAssignMentor, onAssignSuccessDone }) {
  const [mentorData, setMentorData] = useState(initialMentor);
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const mentorUserId =
    initialMentor?.user_id ||
    initialMentor?.mentor_user_id ||
    initialMentor?.id ||
    initialMentor?.user?.id;

  useEffect(() => {
    setMentorData(initialMentor);
    if (!mentorUserId) return;

    let isMounted = true;
    const fetchLatestProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/mentors/${mentorUserId}`);
        if (isMounted && res.data) {
          // Merge fresh backend data over initial mentor info
          setMentorData((prev) => ({ ...prev, ...res.data, user: { ...(prev?.user || {}), ...(res.data.user || {}) } }));
        }
      } catch (err) {
        console.warn("Could not fetch real-time mentor profile details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLatestProfile();
    return () => {
      isMounted = false;
    };
  }, [initialMentor, mentorUserId]);

  if (!mentorData) {
    return (
      <section className="panel full-page-panel">
        <p className="muted">No mentor selected.</p>
      </section>
    );
  }

  const mentor = mentorData;

  const extract = (keys) => {
    for (const key of keys) {
      if (mentor[key] !== undefined && mentor[key] !== null && mentor[key] !== "") return mentor[key];
      if (mentor.profiles?.[key] !== undefined && mentor.profiles?.[key] !== null && mentor.profiles?.[key] !== "") return mentor.profiles[key];
      if (mentor.profile?.[key] !== undefined && mentor.profile?.[key] !== null && mentor.profile?.[key] !== "") return mentor.profile[key];
      if (mentor.user?.[key] !== undefined && mentor.user?.[key] !== null && mentor.user?.[key] !== "") return mentor.user[key];
    }
    return null;
  };

  const name =
    extract(["full_name", "name"]) ||
    `${extract(["first_name"]) || ""} ${extract(["last_name"]) || ""}`.trim() ||
    "N/A";

  const email = extract(["email"]) || "N/A";
  const jobTitle = extract(["job_title", "title", "role"]);
  const employer = extract(["employer", "company"]);

  const capacity = extract(["capacity", "max_capacity", "max_monthly_sessions"]) ?? 3;
  const assignedCount = extract(["assigned_count", "current_mentees_count"]) ?? 0;
  const openSlots = Math.max(capacity - assignedCount, 0);

  const about = extract(["bio", "about", "summary", "description"]);
  const phone = extract(["phone_number", "phone"]);
  const county = extract(["county"]);
  const state = extract(["state"]);
  const location = [county, state].filter(Boolean).join(", ") || null;
  const major = extract(["major"]);
  const almaMater = extract(["alma_mater", "school"]);
  const experience = extract(["experience", "experience_level"]);
  const linkedinUrl = extract(["linkedin_url", "linkedin"]);

  // Gender mapping logic
  const rawGender = (extract(["gender", "sex", "pronouns"]) || "").trim().toLowerCase();
  let gender = "N/A";
  if (rawGender === "m" || rawGender === "male") {
    gender = "Male";
  } else if (rawGender === "f" || rawGender === "female") {
    gender = "Female";
  } else if (rawGender) {
    gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1);
  }

  const industry = extract(["industry", "field", "career_field"]) || "General";
  const rawExpertise = extract(["expertise", "specialization", "skills"]) || jobTitle;
  const expertise = Array.isArray(rawExpertise) ? rawExpertise.join(", ") : (rawExpertise || "N/A");

  let servicesOffered = [];
  const rawServices = extract(["service_types", "services_offered", "services", "service", "mentorship_type"]);

  if (Array.isArray(rawServices)) {
    servicesOffered = rawServices;
  } else if (typeof rawServices === "string") {
    try {
      const parsed = JSON.parse(rawServices);
      servicesOffered = Array.isArray(parsed) ? parsed : [rawServices];
    } catch {
      servicesOffered = rawServices.split(",").map((s) => s.trim());
    }
  }
  const serviceLabel =
    servicesOffered.length > 0
      ? servicesOffered.map((s) => formatService(s)).join(", ")
      : "N/A";

  const handleConfirmAssign = () => {
    if (onAssignMentor) {
      onAssignMentor(mentor);
    }
    setShowAssignModal(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="mentor-profile-container">
      <button type="button" className="mentor-profile-back-btn" onClick={onBack}>
        <span aria-hidden="true">&larr;</span> back to mentors
      </button>

      <h1 className="page-title">Mentor Profile {loading && <span style={{ fontSize: "14px", fontWeight: "normal", color: "#6b7280" }}>(Refreshing...)</span>}</h1>

      <div className="mentor-profile-header-card">
        <span className="mentor-profile-avatar" aria-hidden="true">{initials(name)}</span>
        <div className="mentor-profile-header-main">
          <h2 className="mentor-profile-name">{name}</h2>
          <p className="applicant-email" style={{ fontSize: "14px", color: "#6b7280" }}>{email}</p>
          {jobTitle && <p className="mentor-profile-role">{jobTitle}</p>}
          {employer && <p className="mentor-profile-employer">{employer}</p>}
        </div>
        <div className="mentor-profile-capacity-box">
          <span className="mentor-profile-capacity-label">Capacity Tracking</span>
          <p className="mentor-profile-capacity-value">
            <strong>{assignedCount}/{capacity}</strong> active mentees ({openSlots} open {openSlots === 1 ? "slot" : "slots"})
          </p>
        </div>
      </div>

      <div className="mentor-profile-about-card">
        <h3 className="mentor-profile-section-title">
          <Icon name="about" className="mentor-profile-icon" />
          About
        </h3>
        <p className="mentor-profile-about-text">
          {about || "This mentor hasn't added a bio yet."}
        </p>
      </div>

      <div className="mentor-profile-info-card">
        <h3 className="mentor-profile-section-title">
          <Icon name="clipboard" className="mentor-profile-icon" />
          Mentor Information
        </h3>
        <div className="mentor-profile-info-grid">
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Gender</span>
            <span className="mentor-profile-info-value">{gender}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Phone Number</span>
            <span className="mentor-profile-info-value">{phone || "N/A"}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Location</span>
            <span className="mentor-profile-info-value">{location || "N/A"}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Industry</span>
            <span className="mentor-profile-info-value">{industry}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Experience Level</span>
            <span className="mentor-profile-info-value">{experience || "N/A"}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Major &amp; Education</span>
            <span className="mentor-profile-info-value">
              {[major, almaMater].filter(Boolean).join(" • ") || "N/A"}
            </span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">Services Offered</span>
            <span className="mentor-profile-info-value">{serviceLabel}</span>
          </div>
          <div className="mentor-profile-info-cell">
            <span className="mentor-profile-info-label">LinkedIn</span>
            <span className="mentor-profile-info-value">
              {linkedinUrl ? (
                <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "#007ca6" }}>
                  View LinkedIn
                </a>
              ) : (
                "N/A"
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mentor-profile-assign-bar">
        <button
          type="button"
          className="mentor-profile-assign-btn"
          onClick={() => setShowAssignModal(true)}
        >
          Assign Mentor
        </button>
      </div>

      {/* Assign confirmation modal — copied exactly from MentorRequestDetail.jsx accept modal */}
      {showAssignModal && (
        <div className="mrq-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="mrq-modal" onClick={(e) => e.stopPropagation()}>
            <svg width="97" height="97" viewBox="0 0 97 97" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48.5" cy="48.5" r="48" fill="#8ACBDB" fillOpacity="0.2" stroke="#007CA6"/>
              <path d="M48.5 41.4688V26.2344C48.5 24.6804 49.1173 23.19 50.2162 22.0912C51.315 20.9923 52.8054 20.375 54.3594 20.375C55.9134 20.375 57.4037 20.9923 58.5026 22.0912C59.6014 23.19 60.2187 24.6804 60.2188 26.2344V49.6719" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M36.7812 43.8125V21.5469C36.7812 19.9929 37.3986 18.5025 38.4974 17.4037C39.5963 16.3048 41.0866 15.6875 42.6406 15.6875C44.1946 15.6875 45.685 16.3048 46.7838 17.4037C47.8827 18.5025 48.5 19.9929 48.5 21.5469V41.4688" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M48.5 61.3906C48.5 58.2826 49.7347 55.3019 51.9323 53.1042C54.13 50.9065 57.1107 49.6719 60.2188 49.6719V43.8125C60.2188 42.2585 60.8361 40.7681 61.9349 39.6693C63.0338 38.5705 64.5241 37.9531 66.0781 37.9531C67.6321 37.9531 69.1225 38.5705 70.2213 39.6693C71.3202 40.7681 71.9375 42.2585 71.9375 43.8125V55.5312C71.9375 61.7473 69.4682 67.7087 65.0728 72.1041C60.6774 76.4994 54.716 78.9688 48.5 78.9688C42.284 78.9688 36.3226 76.4994 31.9272 72.1041C27.5318 67.7087 25.0625 61.7473 25.0625 55.5312V33.2656C25.0625 31.7116 25.6798 30.2213 26.7787 29.1224C27.8775 28.0236 29.3679 27.4062 30.9219 27.4062C32.4759 27.4062 33.9662 28.0236 35.0651 29.1224C36.1639 30.2213 36.7812 31.7116 36.7812 33.2656V43.8125" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="mrq-modal-title">Assign Mentor?</h2>
            <p className="mrq-modal-subtitle">
              You are assigning {name} to this applicant.
            </p>

            <div className="mrq-modal-notice">
              <span>ⓘ</span>
              This will notify the mentor and send them the applicant request.
            </div>

            <div className="mrq-modal-btns">
              <button className="mrq-btn-cancel" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button className="mrq-btn-accept-confirm" onClick={handleConfirmAssign}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal — copied exactly from MentorRequestDetail.jsx successAction block */}
      {showSuccessModal && (
        <div className="mrq-modal-overlay">
          <div className="mrq-modal">
            <div className="mrq-success-icon mrq-success-icon--green">✓</div>
            <h2 className="mrq-modal-title">Mentor Assigned!</h2>
            <p className="mrq-modal-subtitle">
              {name} has been assigned. The mentor has been notified and can now accept or decline the request.
            </p>
            <div className="mrq-modal-btns">
              <button
                className="mrq-btn-accept-confirm"
                onClick={() => {
                  setShowSuccessModal(false);
                  onAssignSuccessDone?.();
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}