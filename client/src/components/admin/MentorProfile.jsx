import { useState, useEffect } from "react";
import api from "../../api/api";
import "../admin_styling/MentorProfile.css";

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

export default function MentorProfile({ mentor: initialMentor, onBack, onAssignMentor }) {
  const [mentorData, setMentorData] = useState(initialMentor);
  const [loading, setLoading] = useState(false);

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
        <h3 className="mentor-profile-section-title">About</h3>
        <p className="mentor-profile-about-text">
          {about || "This mentor hasn't added a bio yet."}
        </p>
      </div>

      <div className="mentor-profile-info-card">
        <h3 className="mentor-profile-section-title">
          <span className="mentor-profile-info-icon" aria-hidden="true">📋</span> Mentor Information
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
          className="figma-primary-btn"
          onClick={() => {
            if (onAssignMentor) {
              onAssignMentor(mentor);
            }
          }}
        >
          Assign Mentor
        </button>
      </div>
    </div>
  );
}