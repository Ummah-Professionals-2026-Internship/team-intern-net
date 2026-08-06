import { useMemo, useState } from "react";
import { normalizeMentor } from "./mentorUtils";
import "../admin_styling/FullMentorMatchPanel.css";
import "/src/views/mentor/MentorRequests.css";

function initials(name) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Shared formatting for service badge labels
function formatServiceLabel(raw) {
  if (!raw) return null;
  const lower = String(raw).toLowerCase().replace(/_/g, " ").trim();
  if (lower.includes("resume")) return "Resume Review";
  if (lower.includes("mock") || lower.includes("interview")) return "Mock Interview";
  if (lower.includes("career") || lower.includes("advice")) return "Career Advice";
  if (lower.includes("healthcare")) return "Healthcare Service";
  if (lower.includes("mentorship") || lower.includes("program")) return "Mentorship Program";
  // Fallback: title-case the cleaned string
  return lower.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getServiceBadgeClass(label) {
  const lower = label.toLowerCase();
  if (lower.includes("interview")) return "service-badge badge-interview";
  if (lower.includes("resume")) return "service-badge badge-resume";
  return "service-badge badge-advice";
}

function scoreMentor(mentor, applicant) {
  let score = 40; // baseline
  const clean = (s) => (s ? String(s).toLowerCase().replace(/_/g, " ").trim() : "");

  const desiredCareer = clean(applicant.desired_career || applicant.career || applicant.career_goal);
  const industry = clean(applicant.industry);
  const service = clean(applicant.service_requested || applicant.service || applicant.service_type);
  const appMajor = clean(applicant.major);
  const appGender = clean(applicant.gender || applicant.user?.gender);

  const mentorIndustry = clean(mentor.industry);
  const mentorJobTitle = clean(mentor.jobTitle || mentor.job_title || mentor.title);
  const mentorMajor = clean(mentor.major || mentor.raw?.major);
  const mentorGender = clean(mentor.raw?.gender || mentor.gender || mentor.user?.gender);
  const formattedServices = (mentor.servicesOffered || mentor.service_types || mentor.raw?.service_types || []).map(clean);

  // 1. Industry / Career match
  if (industry && mentorIndustry && (industry.includes(mentorIndustry) || mentorIndustry.includes(industry))) score += 25;
  if (desiredCareer && mentorJobTitle && (mentorJobTitle.includes(desiredCareer) || desiredCareer.includes(mentorJobTitle))) score += 20;

  // 2. Service Requested match (dynamic string overlap)
  if (service && formattedServices.length > 0) {
    const isServiceMatch = formattedServices.some((s) => s && (s === service || s.includes(service) || service.includes(s)));
    if (isServiceMatch) score += 25;
  }

  // 3. Major match
  if (appMajor && mentorMajor && appMajor === mentorMajor) score += 15;

  // 4. Gender match
  if (appGender && mentorGender && appGender === mentorGender) score += 10;

  // 5. Dynamic Tag / Skill overlap
  const appTags = new Set(
    [...(applicant.tags || []), service, desiredCareer, industry, appMajor].filter(Boolean).map(clean)
  );
  const mentorTags = new Set(
    [...(mentor.tags || mentor.raw?.tags || []), ...formattedServices, mentorIndustry, mentorJobTitle, mentorMajor].filter(Boolean).map(clean)
  );

  let tagMatches = 0;
  appTags.forEach((t) => {
    if (t && mentorTags.has(t)) tagMatches++;
  });
  score += Math.min(20, tagMatches * 5);

  if (mentor.assignedCount < mentor.capacity) score += 5;

  return Math.max(0, Math.min(99, score));
}

export default function FullMentorMatchPanel({
  applicant,
  applicants = [],
  mentors,
  loading,
  onBack,
  onBrowseAllMentors,
  onViewMentor,
  onAssignMentor,
  onSelectApplicant,
  onAssignSuccessDone, 
}) {
  const [pendingMentor, setPendingMentor] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const recommendations = useMemo(() => {
    if (!applicant || !mentors) return [];
    return mentors
      .map(normalizeMentor)
      .map((m) => ({ ...m, matchScore: scoreMentor(m, applicant) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }, [applicant, mentors]);

  if (!applicant) {
    const pendingApplicants = applicants.filter(
      (a) => !a.status || a.status === "submitted"
    );
    const optionsList = pendingApplicants.length > 0 ? pendingApplicants : applicants;

    return (
      <div className="match-panel-container">
        {onBack && (
          <button type="button" className="back-link-btn" onClick={onBack}>
            ← Back
          </button>
        )}

        <div className="page-header">
          <h1 className="page-title">Recommended Mentors</h1>
          <p className="page-subtitle">Select an applicant to see recommended mentors.</p>
        </div>

        <div className="match-applicant-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
          <label style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main, #1e293b)" }}>
            Select Student Applicant:
          </label>
          {optionsList.length > 0 ? (
            <select
              className="filter-select"
              style={{ width: "100%", maxWidth: "420px" }}
              defaultValue=""
              onChange={(e) => {
                const selected = applicants.find((a) => String(a.id) === e.target.value);
                if (selected && onSelectApplicant) {
                  onSelectApplicant(selected);
                }
              }}
            >
              <option value="" disabled>-- Choose an applicant to match --</option>
              {optionsList.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.full_name || app.email || "Unnamed Applicant"} ({app.desired_career || app.major || "Applicant"})
                </option>
              ))}
            </select>
          ) : (
            <p className="muted">No student applicants found.</p>
          )}
        </div>

      </div>
    );
  }

  const applicantName =
    applicant.full_name ||
    `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() ||
    "N/A";
  const desiredCareer = applicant.desired_career || applicant.career || "N/A";
  const industry = applicant.industry || "N/A";
  // API returns service_type (enum), fallback to other field names
  const rawService = applicant.service_type || applicant.service_requested || applicant.service;
  const serviceRequested = rawService ? formatServiceLabel(rawService) : "N/A";
  const isPending = (applicant.status || "submitted") !== "assigned";
  const appliedOn = applicant.submitted_at || applicant.applied_at || applicant.created_at;

  const handleConfirmAssign = () => {
    if (pendingMentor) {
      onAssignMentor?.(applicant, pendingMentor.raw || pendingMentor);
    }
    setPendingMentor(null);
    setShowSuccessModal(true);
  };

  return (
    <div className="match-panel-container">
      {onBack && (
        <button type="button" className="back-link-btn" onClick={onBack}>
          ← Back
        </button>
      )}

      <div className="page-header">
        <h1 className="page-title">Recommended Mentors</h1>
        <p className="page-subtitle">Select a mentor for this applicant.</p>
      </div>

      <div className="match-applicant-card">
        <span className="match-applicant-avatar" aria-hidden="true">
          {initials(applicantName)}
        </span>
        <div className="match-applicant-main">
          <div className="match-applicant-name-row">
            <span className="match-applicant-name">{applicantName}</span>
            {isPending && <span className="match-pending-pill">Pending Match</span>}
          </div>
          <div className="match-applicant-details">
            <span>
              <strong>Desired Career:</strong> {desiredCareer}
            </span>
            <span>
              <strong>Industry:</strong> {industry}
            </span>
            <span>
              <strong>Service Requested:</strong> {serviceRequested}
            </span>
          </div>
        </div>
        {appliedOn && (
          <span className="match-applied-date">
            Applied on{" "}
            {new Date(appliedOn).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      <div className="match-info-banner">
        <span className="match-info-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.25 21.75H15.75" stroke="#1D2026" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.37847 15.6573C6.48667 14.9608 5.76435 14.0712 5.26581 13.0553C4.76727 12.0395 4.50548 10.9239 4.50011 9.79231C4.47765 5.72709 7.755 2.34777 11.8192 2.25211C13.394 2.21419 14.9409 2.67311 16.2402 3.56378C17.5396 4.45444 18.5256 5.73163 19.0582 7.21418C19.5909 8.69672 19.6432 10.3094 19.2078 11.8233C18.7724 13.3373 17.8713 14.6757 16.6324 15.6487C16.3596 15.8602 16.1383 16.1308 15.9854 16.4403C15.8326 16.7498 15.7521 17.09 15.75 17.4352L15.75 18C15.75 18.1989 15.671 18.3897 15.5303 18.5303C15.3897 18.671 15.1989 18.75 15 18.75H8.99999C8.80108 18.75 8.61031 18.671 8.46966 18.5303C8.32901 18.3897 8.24999 18.1989 8.24999 18L8.24998 17.4346C8.24912 17.0916 8.17021 16.7534 8.01921 16.4454C7.86822 16.1375 7.6491 15.868 7.37847 15.6573V15.6573Z" stroke="#1D2026" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.7617 5.32349C13.6791 5.47942 14.5254 5.91634 15.1838 6.5739C15.8421 7.23147 16.2801 8.07724 16.4372 8.9944" stroke="#1D2026" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p>Mentors are automatically recommended based on the applicant's career goals, skills, industry, and requested services.</p>
      </div>

      <div className="match-mentor-list">
        <div className="match-list-header">
          <span>Mentor</span>
          <span>Match Score</span>
          <span>Capacity</span>
          <span>Action</span>
        </div>

        {loading ? (
          <p className="muted">Loading mentors...</p>
        ) : recommendations.length === 0 ? (
          <p className="muted">No mentor recommendations available yet.</p>
        ) : (
          recommendations.map((m) => {
            const isFull = m.assignedCount >= m.capacity && m.capacity > 0;
            const displayServices = (m.servicesOffered || [])
              .map(formatServiceLabel)
              .filter(Boolean);

            return (
              <div className="match-mentor-row" key={m.id}>
                <div className="match-mentor-info">
                  <span className="match-mentor-avatar" aria-hidden="true">
                    {initials(m.name)}
                  </span>
                  <div className="match-mentor-text">
                    <span className="match-mentor-name">{m.name}</span>
                    <span className="match-mentor-role">
                      {m.jobTitle}
                      {m.raw?.employer || m.raw?.company ? ` · ${m.raw.employer || m.raw.company}` : ""}
                    </span>
                    <div className="match-mentor-badges">
                      {m.raw?.gender && <span className="badge badge-gender">{m.raw.gender}</span>}
                      <span className="badge badge-industry">{m.industry}</span>
                      {displayServices.slice(0, 1).map((s) => (
                        <span className={getServiceBadgeClass(s)} key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="match-mentor-score">
                  <span className="match-score-value">{m.matchScore}%</span>
                </div>

                <div className="match-mentor-capacity">
                  <span className="match-capacity-value">
                    {m.assignedCount}/{m.capacity}
                  </span>
                  <span className="match-capacity-label">active mentees</span>
                </div>

                <div className="match-mentor-actions">
                  <button
                    type="button"
                    className="match-view-btn"
                    onClick={() => onViewMentor?.(m)}
                  >
                    View Mentor
                  </button>

                  <button
                    type="button"
                    className="match-assign-btn"
                    disabled={isFull}
                    title={isFull ? "Mentor at capacity" : undefined}
                    onClick={() => {
                      if (!applicant) {
                        alert("Please select an applicant first.");
                        return;
                      }
                      setPendingMentor(m);
                    }}
                  >
                    Assign Mentor
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      

      {onBrowseAllMentors && (
        <button type="button" className="match-browse-all-btn" onClick={onBrowseAllMentors}>
          Browse All Mentors
        </button>
      )}

      {/* Assign confirmation modal */}
      {pendingMentor && (
        <div className="mrq-modal-overlay" onClick={() => setPendingMentor(null)}>
          <div className="mrq-modal" onClick={(e) => e.stopPropagation()}>
            <svg width="97" height="97" viewBox="0 0 97 97" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48.5" cy="48.5" r="48" fill="#8ACBDB" fillOpacity="0.2" stroke="#007CA6"/>
              <path d="M48.5 41.4688V26.2344C48.5 24.6804 49.1173 23.19 50.2162 22.0912C51.315 20.9923 52.8054 20.375 54.3594 20.375C55.9134 20.375 57.4037 20.9923 58.5026 22.0912C59.6014 23.19 60.2187 24.6804 60.2188 26.2344V49.6719" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M36.7812 43.8125V21.5469C36.7812 19.9929 37.3986 18.5025 38.4974 17.4037C39.5963 16.3048 41.0866 15.6875 42.6406 15.6875C44.1946 15.6875 45.685 16.3048 46.7838 17.4037C47.8827 18.5025 48.5 19.9929 48.5 21.5469V41.4688" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M48.5 61.3906C48.5 58.2826 49.7347 55.3019 51.9323 53.1042C54.13 50.9065 57.1107 49.6719 60.2188 49.6719V43.8125C60.2188 42.2585 60.8361 40.7681 61.9349 39.6693C63.0338 38.5705 64.5241 37.9531 66.0781 37.9531C67.6321 37.9531 69.1225 38.5705 70.2213 39.6693C71.3202 40.7681 71.9375 42.2585 71.9375 43.8125V55.5312C71.9375 61.7473 69.4682 67.7087 65.0728 72.1041C60.6774 76.4994 54.716 78.9688 48.5 78.9688C42.284 78.9688 36.3226 76.4994 31.9272 72.1041C27.5318 67.7087 25.0625 61.7473 25.0625 55.5312V33.2656C25.0625 31.7116 25.6798 30.2213 26.7787 29.1224C27.8775 28.0236 29.3679 27.4062 30.9219 27.4062C32.4759 27.4062 33.9662 28.0236 35.0651 29.1224C36.1639 30.2213 36.7812 31.7116 36.7812 33.2656V43.8125" stroke="#007CA6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="mrq-modal-title">Assign Mentor?</h2>
            <p className="mrq-modal-subtitle">
              You are assigning {pendingMentor.name} to {applicantName}.
            </p>

            <div className="mrq-modal-notice">
              <span>ⓘ</span>
              This will notify the mentor and send them the applicant request.
            </div>

            <div className="mrq-modal-btns">
              <button className="mrq-btn-cancel" onClick={() => setPendingMentor(null)}>
                Cancel
              </button>
              <button className="mrq-btn-accept-confirm" onClick={handleConfirmAssign}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <div className="mrq-modal-overlay">
          <div className="mrq-modal">
            <div className="mrq-success-icon mrq-success-icon--green">✓</div>
            <h2 className="mrq-modal-title">Mentor Assigned!</h2>
            <p className="mrq-modal-subtitle">
              The mentor has been notified and can now accept or decline the request.
            </p>
            <div className="mrq-modal-btns">
              <button 
                className="mrq-btn-accept-confirm" 
                onClick={() => {
                  setShowSuccessModal(false)
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