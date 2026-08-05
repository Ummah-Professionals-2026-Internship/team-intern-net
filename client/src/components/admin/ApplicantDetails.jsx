import React, { useState } from "react";
import "../admin_styling/ApplicantDetails.css";
import Icon from "../ui/Icon";

// Dynamic API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const GENDER_MAP = {
  m: "Male",
  f: "Female",
  male: "Male",
  female: "Female",
};

const SERVICE_MAP = {
  resume_review: "Resume Review",
  mock_interview: "Mock Interview",
  career_advice: "Career Advice",
  mentorship: "Mentorship",
};

export default function ApplicantDetails({ applicant, onBackToList, onFindMatches }) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!applicant) return null;

  const {
    full_name,
    first_name,
    last_name,
    email,
    phone,
    gender,
    academic_level,
    academic_standing,
    education_level,
    major,
    industry,
    desired_career,
    service_requested,
    service_type,
    status,
    created_at,
    applied_date,
    city,
    state,
    location,
    resume_url,
    resume_name,
    comments,
    goals,
    student,
  } = applicant;

  // --- Helpers ---
  const displayName =
    full_name ||
    `${first_name || ""} ${last_name || ""}`.trim() ||
    student?.user?.full_name ||
    "Applicant";

  const displayEmail = email || student?.user?.email || "N/A";
  const displayPhone = phone || "N/A";

  const displayLocation =
    location ||
    [city, state].filter(Boolean).join(", ") ||
    "Location Not Provided";

  const formattedDate =
    applied_date ||
    (created_at
      ? new Date(created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null);

  const displayStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Submitted";

  const rawGender = (gender || student?.user?.gender || "").toLowerCase();
  const displayGender = GENDER_MAP[rawGender] || gender || "N/A";

  const getAcademicLevel = () => {
    const standing = academic_standing || student?.academic_standing;
    if (standing) return standing.charAt(0).toUpperCase() + standing.slice(1);

    const commentsText = comments || goals || "";
    if (commentsText.includes("[Academic Level:")) {
      const match = commentsText.match(/\[Academic Level:\s*([^\]]+)\]/);
      if (match && match[1]) return match[1];
    }

    const eduLevel = academic_level || education_level || student?.education_level;
    if (eduLevel) return eduLevel.charAt(0).toUpperCase() + eduLevel.slice(1);

    return "N/A";
  };

  const rawService = service_requested || service_type;
  const displayService =
    SERVICE_MAP[rawService] ||
    (rawService
      ? rawService.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "N/A");

  const displayComments = comments || goals;

  // --- Resume Helpers ---
  const rawResumePath = resume_url || student?.resume_url;

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
    resume_name ||
    (rawResumePath ? rawResumePath.split(/[\/\\]/).pop() : "No File Uploaded");

  const isPdf = Boolean(finalResumeUrl?.toLowerCase().endsWith(".pdf"));
  const isWordDoc = Boolean(
    finalResumeUrl &&
      (finalResumeUrl.toLowerCase().endsWith(".doc") ||
        finalResumeUrl.toLowerCase().endsWith(".docx"))
  );

  const isLocalhost = Boolean(
    API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1")
  );

  // In-modal iframe source (Only uses Google Docs Viewer in production for Word docs)
  const frameSourceUrl = isPdf
    ? finalResumeUrl
    : isWordDoc && !isLocalhost
    ? `https://docs.google.com/gview?url=${encodeURIComponent(finalResumeUrl)}&embedded=true`
    : null;

  // --- Tab / Download Action Handler ---
  const handleOpenNewTab = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!finalResumeUrl) return;

    if (isPdf) {
      // 1. MUST call window.open synchronously FIRST before any conditions
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
      // Direct file download for local Word documents
      const link = document.createElement("a");
      link.href = finalResumeUrl;
      link.setAttribute("download", displayResumeName || "resume");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="applicant-details-container">
      <button className="back-link-btn" onClick={onBackToList}>
        &lt; Back to Applicants
      </button>

      <h1 className="details-main-title">Applicant Details</h1>

      {/* 1. TOP HERO CARD */}
      <div className="card top-profile-card">
        <div className="profile-hero-left">
          <div className="avatar-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="hero-info">
            <h2>{displayName}</h2>
            <span className={`status-pill ${displayStatus.toLowerCase().replace(/\s+/g, "-")}`}>
              {displayStatus}
            </span>
            {formattedDate && <p className="sub-text">Applied on {formattedDate}</p>}
          </div>
        </div>

        <div className="profile-hero-right">
          <p>{displayEmail}</p>
          <p>{displayPhone}</p>
          <p>{displayLocation}</p>
        </div>
      </div>

      {/* 2. THREE-COLUMN GRID */}
      <div className="details-grid-3col">
        {/* Personal Information */}
        <div className="card details-card">
          <div className="card-header">
            <span className="icon-badge badge-yellow">
              <Icon name="personal" />
            </span>
            <h3>Personal Information</h3>
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Full Name</span>
              <span className="info-val">{displayName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-val">{displayEmail}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone Number</span>
              <span className="info-val">{displayPhone}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gender</span>
              <span className="info-val">{displayGender}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Academic Level</span>
              <span className="info-val">{getAcademicLevel()}</span>
            </div>
          </div>
        </div>

        {/* Career Information */}
        <div className="card details-card">
          <div className="card-header">
            <span className="icon-badge badge-green">
              <Icon name="briefcase" />
            </span>
            <h3>Career Information</h3>
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Major/Field of Study</span>
              <span className="info-val">{major || student?.major || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Industry of Interest</span>
              <span className="info-val">{industry || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Desired Career</span>
              <span className="info-val">{desired_career || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Service Requested</span>
              <span className="info-val">{displayService}</span>
            </div>
          </div>
        </div>

        {/* Uploaded Resume */}
        <div className="card details-card resume-card">
          <div className="card-header">
            <span className="icon-badge badge-purple">
              <Icon name="file" />
            </span>
            <h3>Uploaded Resume</h3>
          </div>
          <div className="resume-preview-box">
            <strong className="file-name">{displayResumeName}</strong>
            {formattedDate && <span className="upload-date">uploaded on {formattedDate}</span>}
          </div>
          {finalResumeUrl ? (
            <button
              type="button"
              className="btn-primary view-resume-btn"
              onClick={() => setShowPreviewModal(true)}
            >
              Preview Resume
            </button>
          ) : (
            <button className="btn-disabled view-resume-btn" disabled>
              No Resume Available
            </button>
          )}
        </div>
      </div>

      {/* 3. COMMENTS / GOALS CARD */}
      <div className="card comments-card">
        <div className="card-header">
          <span className="icon-badge badge-pink">
            <Icon name="bulb" />
          </span>
          <h3>Comments/Goals</h3>
        </div>
        <p className="comments-text">
          {displayComments || "No additional comments or goals provided."}
        </p>
      </div>

      {/* 4. FOOTER ACTIONS */}
      <div className="details-actions">
        <button className="btn-secondary" onClick={onBackToList}>
          Back to Applicants
        </button>
        {onFindMatches && (
          <button className="btn-primary" onClick={() => onFindMatches(applicant)}>
            View Mentor Matches
          </button>
        )}
      </div>

      {/* 5. RESUME PREVIEW MODAL */}
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