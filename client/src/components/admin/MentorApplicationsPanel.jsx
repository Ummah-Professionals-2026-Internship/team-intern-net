import { useState, useMemo } from "react";
import api from "../../api/api";
import "../admin_styling/MentorApplicationsPanel.css";

export default function MentorApplicationsPanel({
  loading,
  applications = [],
  onRefresh,
}) {
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const name = app.full_name || "";
      const email = app.email || "";
      const employer = app.employer || "";
      const title = app.job_title || "";
      const q = searchTerm.toLowerCase();
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        employer.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [applications, searchTerm]);

  const handleReview = async (appId, newStatus) => {
    setReviewingId(appId);
    try {
      await api.patch(`/mentor/applications/${appId}/review`, { status: newStatus });
      if (onRefresh) await onRefresh();
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error("Failed to review application:", err);
      alert(err.response?.data?.detail || "Failed to update application status.");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="applicant-page-container">
      <div className="page-header">
        <h1 className="page-title">Pending Mentor Applications</h1>
        <p className="page-subtitle">
          Review and approve incoming advisor signups for the Career Prep program.
        </p>
      </div>

      <section className="panel figma-table-panel">
        <div className="figma-filter-bar">
          <div className="search-input-wrapper">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M23.1077 25.3259C21.1467 26.8207 18.6978 27.7083 16.0417 27.7083C9.59835 27.7083 4.375 22.485 4.375 16.0417C4.375 9.59835 9.59835 4.375 16.0417 4.375C22.485 4.375 27.7083 9.59835 27.7083 16.0417C27.7083 19.0623 26.5604 21.8148 24.677 23.8867C24.7157 23.9131 24.7532 23.9422 24.7892 23.9742L31.3517 29.8075C31.8031 30.2088 31.8438 30.9002 31.4425 31.3516C31.0412 31.8031 30.3498 31.8438 29.8984 31.4425L23.3359 25.6091C23.2419 25.5257 23.1658 25.4297 23.1077 25.3259ZM25.5208 16.0417C25.5208 21.2769 21.2769 25.5208 16.0417 25.5208C10.8065 25.5208 6.5625 21.2769 6.5625 16.0417C6.5625 10.8065 10.8065 6.5625 16.0417 6.5625C21.2769 6.5625 25.5208 10.8065 25.5208 16.0417Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, employer, or job title"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="figma-search-input"
            />
          </div>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "24px" }}>Loading pending applications...</p>
        ) : filteredApps.length === 0 ? (
          <p className="muted" style={{ padding: "24px" }}>No pending mentor applications found.</p>
        ) : (
          <div className="table-responsive">
            <table className="figma-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job Title / Employer</th>
                  <th>Industry</th>
                  <th>Services</th>
                  <th>Date Applied</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => {
                  const dateStr = app.applied_at
                    ? new Date(app.applied_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A";
                  const services = Array.isArray(app.service_types)
                    ? app.service_types.join(", ")
                    : "N/A";

                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{app.full_name}</span>
                          <span className="applicant-email">{app.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="career-text">
                          {app.job_title || "N/A"} {app.employer ? `at ${app.employer}` : ""}
                        </span>
                      </td>
                      <td><span className="career-text">{app.industry || "N/A"}</span></td>
                      <td><span className="career-text">{services}</span></td>
                      <td><span className="date-text">{dateStr}</span></td>
                      <td>
                        <div className="action-cell" style={{ gap: "8px" }}>
                          <button
                            type="button"
                            className="figma-view-btn"
                            onClick={() => setSelectedApp(app)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-approve"
                            disabled={reviewingId === app.id}
                            onClick={() => handleReview(app.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            disabled={reviewingId === app.id}
                            onClick={() => handleReview(app.id, "rejected")}
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Details Modal */}
      {selectedApp && (
        <div className="modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <h3>Mentor Application: {selectedApp.full_name}</h3>
            <div className="modal-info-list" style={{ marginTop: "16px", display: "grid", gap: "10px", fontSize: "14px" }}>
              <p><strong>Email:</strong> {selectedApp.email}</p>
              <p><strong>Phone:</strong> {selectedApp.phone_number || "N/A"}</p>
              <p><strong>Employer / Title:</strong> {selectedApp.job_title} at {selectedApp.employer}</p>
              <p><strong>Industry:</strong> {selectedApp.industry || "N/A"}</p>
              <p><strong>Alma Mater / Major:</strong> {selectedApp.alma_mater} ({selectedApp.major})</p>
              <p><strong>Location:</strong> {[selectedApp.county, selectedApp.state].filter(Boolean).join(", ") || "N/A"}</p>
              <p><strong>LinkedIn:</strong> {selectedApp.linkedin_url ? <a href={selectedApp.linkedin_url} target="_blank" rel="noreferrer">{selectedApp.linkedin_url}</a> : "N/A"}</p>
              <p><strong>Experience:</strong> {selectedApp.experience || "N/A"}</p>
              <p><strong>Other Info:</strong> {selectedApp.other_info || "N/A"}</p>
            </div>
            <div className="modal-actions" style={{ marginTop: "24px" }}>
              <button type="button" className="btn-secondary" onClick={() => setSelectedApp(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-reject"
                disabled={reviewingId === selectedApp.id}
                onClick={() => handleReview(selectedApp.id, "rejected")}
              >
                Decline
              </button>
              <button
                type="button"
                className="btn-approve"
                disabled={reviewingId === selectedApp.id}
                onClick={() => handleReview(selectedApp.id, "approved")}
              >
                Approve &amp; Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
