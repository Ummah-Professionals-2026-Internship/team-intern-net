import { useState, useMemo, useEffect, useRef } from "react";
import ApplicantDetails from "./ApplicantDetails";

// Strictly allowed Applicant Services
const APPLICANT_SERVICE_MAP = {
  resume_review: "Resume Review",
  resume: "Resume Review",
  mock_interview: "Mock Interview",
  interview: "Mock Interview",
  career_advice: "Career Advice",
  advice: "Career Advice",
  // Sanitization for legacy/misassigned records
  mentorship: "Career Advice",
  mentorship_program: "Career Advice",
};

export default function FullApplicantPanel({
  loading,
  data = [],
  selectedApplicant,
  onViewApplicant,
  onBackToList,
  onUpdateStatus,
  onDeleteApplicant,
  onFindMatches,
}) {
  const ITEMS_PER_PAGE = 10;

  // 1. STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [careerFilter, setCareerFilter] = useState("All Careers");
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown & Modal state for actions menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const [applicantToDelete, setApplicantToDelete] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. HELPER FUNCTIONS
  const formatServiceLabel = (rawService) => {
    if (!rawService) return "Career Advice";
    const lower = rawService.toLowerCase().replace(/_/g, " ").trim();

    if (lower.includes("resume")) return "Resume Review";
    if (lower.includes("mock") || lower.includes("interview")) return "Mock Interview";
    return "Career Advice";
  };

  const getServiceBadgeClass = (displayService) => {
    const lower = displayService.toLowerCase();
    if (lower.includes("interview")) return "service-badge badge-interview";
    if (lower.includes("resume")) return "service-badge badge-resume";
    return "service-badge badge-advice";
  };

  const getStatusTextAndClass = (app) => {
    const rawStatus = (app.status || (app.is_assigned ? "assigned" : "pending")).toLowerCase();
    if (rawStatus.includes("pending") || rawStatus === "submitted") {
      return { label: "Pending Match", className: "status-text status-pending" };
    }
    if (rawStatus.includes("match") || rawStatus === "assigned") {
      return { label: "Matched", className: "status-text status-matched" };
    }
    if (rawStatus.includes("meeting") || rawStatus === "scheduled") {
      return { label: "Meeting Scheduled", className: "status-text status-meeting" };
    }
    return { label: app.status || "Submitted", className: "status-text" };
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const confirmDelete = (app) => {
    setOpenMenuId(null);
    setApplicantToDelete(app);
  };

  const handleExecuteDelete = () => {
    if (applicantToDelete && onDeleteApplicant) {
      onDeleteApplicant(applicantToDelete);
    }
    setApplicantToDelete(null);
  };

  // 3. DYNAMICALLY EXTRACT UNIQUE CAREERS FROM DATA
  const uniqueCareers = useMemo(() => {
    const careers = new Set();
    data.forEach((app) => {
      const career = app.desired_career || app.major;
      if (career && career.trim() !== "") {
        careers.add(career.trim());
      }
    });
    return Array.from(careers).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // 4. MEMOIZED FILTERING WITH SANITIZED DATA
  const filteredData = useMemo(() => {
    let result = data.filter((app) => {
      const name = app.full_name || `${app.first_name || ""} ${app.last_name || ""}`.trim();
      const email = app.email || "";
      const career = app.desired_career || app.major || "";
      
      const rawService = app.service_requested || app.service_type || "";
      const displayService = formatServiceLabel(rawService);

      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        career.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All Statuses" ||
        (app.status || "").toLowerCase() === statusFilter.toLowerCase();

      const matchesCareer =
        careerFilter === "All Careers" ||
        career.toLowerCase().trim() === careerFilter.toLowerCase().trim();

      const matchesService =
        serviceFilter === "All Services" ||
        displayService.toLowerCase() === serviceFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCareer && matchesService;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });
  }, [data, searchTerm, statusFilter, careerFilter, serviceFilter, sortOrder]);

  if (selectedApplicant) {
    return (
      <ApplicantDetails
        applicant={selectedApplicant}
        onBackToList={onBackToList}
        onUpdateStatus={onUpdateStatus}
        onFindMatches={onFindMatches}
      />
    );
  }

  // 5. PAGINATION CALCULATIONS
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentTableData = filteredData.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="applicant-page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Applicants</h1>
        <p className="page-subtitle">
          View and manage all applicants who have requested career support.
        </p>
      </div>

      {/* Main Panel */}
      <section className="panel figma-table-panel">
        {/* Dynamic Search & Filter Controls */}
        <div className="figma-filter-bar">
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 35 35"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M23.1077 25.3259C21.1467 26.8207 18.6978 27.7083 16.0417 27.7083C9.59835 27.7083 4.375 22.485 4.375 16.0417C4.375 9.59835 9.59835 4.375 16.0417 4.375C22.485 4.375 27.7083 9.59835 27.7083 16.0417C27.7083 19.0623 26.5604 21.8148 24.677 23.8867C24.7157 23.9131 24.7532 23.9422 24.7892 23.9742L31.3517 29.8075C31.8031 30.2088 31.8438 30.9002 31.4425 31.3516C31.0412 31.8031 30.3498 31.8438 29.8984 31.4425L23.3359 25.6091C23.2419 25.5257 23.1658 25.4297 23.1077 25.3259ZM25.5208 16.0417C25.5208 21.2769 21.2769 25.5208 16.0417 25.5208C10.8065 25.5208 6.5625 21.2769 6.5625 16.0417C6.5625 10.8065 10.8065 6.5625 16.0417 6.5625C21.2769 6.5625 25.5208 10.8065 25.5208 16.0417Z"
              />
            </svg>
            <input
              type="text"
              placeholder="search applicants by name, email, or career"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="figma-search-input"
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="submitted">Pending Match</option>
            <option value="assigned">Matched</option>
            <option value="scheduled">Meeting Scheduled</option>
          </select>

          {/* Dynamic Career Filter */}
          <select
            className="filter-select"
            value={careerFilter}
            onChange={(e) => handleFilterChange(setCareerFilter, e.target.value)}
          >
            <option value="All Careers">All Careers</option>
            {uniqueCareers.map((career) => (
              <option key={career} value={career}>
                {career}
              </option>
            ))}
          </select>

          {/* Strictly 3 Applicant Options */}
          <select
            className="filter-select"
            value={serviceFilter}
            onChange={(e) => handleFilterChange(setServiceFilter, e.target.value)}
          >
            <option value="All Services">All Services</option>
            <option value="Career Advice">Career Advice</option>
            <option value="Mock Interview">Mock Interview</option>
            <option value="Resume Review">Resume Review</option>
          </select>

          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => handleFilterChange(setSortOrder, e.target.value)}
          >
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
          </select>
        </div>

        {/* Data Table */}
        {loading ? (
          <p className="muted" style={{ padding: "24px" }}>Loading applicants...</p>
        ) : totalItems === 0 ? (
          <p className="muted" style={{ padding: "24px" }}>No applicant records found.</p>
        ) : (
          <div className="table-responsive">
            <table className="figma-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Desired Career</th>
                  <th>Service Requested</th>
                  <th>Status</th>
                  <th>Date Applied</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((app, index) => {
                  const name =
                    app.full_name ||
                    `${app.first_name || ""} ${app.last_name || ""}`.trim() ||
                    "N/A";
                  const email = app.email || "N/A";
                  const career = app.desired_career || app.major || "N/A";
                  
                  const rawService = app.service_requested || app.service_type || "";
                  const displayService = formatServiceLabel(rawService);

                  const dateStr = app.created_at
                    ? new Date(app.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A";

                  const statusInfo = getStatusTextAndClass(app);
                  const itemKey = app.id || `app-${startIndex + index}`;

                  return (
                    <tr key={itemKey}>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{name}</span>
                          <span className="applicant-email">{email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="career-text">{career}</span>
                      </td>
                      <td>
                        <span className={getServiceBadgeClass(displayService)}>
                          {displayService}
                        </span>
                      </td>
                      <td>
                        <span className={statusInfo.className}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">{dateStr}</span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            type="button"
                            className="figma-view-btn"
                            onClick={() => onViewApplicant(app)}
                          >
                            View Applicant
                          </button>

                          {/* Kebab Menu Container */}
                          <div 
                            className="menu-container" 
                            style={{ position: "relative", display: "inline-block" }}
                            ref={openMenuId === itemKey ? menuRef : null}
                          >
                            <button 
                              type="button" 
                              className="more-options-btn"
                              onClick={(e) => toggleMenu(e, itemKey)}
                              aria-expanded={openMenuId === itemKey}
                              aria-label="More options"
                            >
                              &#8942;
                            </button>

                            {/* Dropdown Menu - Delete Only */}
                            {openMenuId === itemKey && (
                              <div className="options-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item delete-item"
                                  onClick={() => confirmDelete(app)}
                                >
                                  🗑️ Delete Applicant
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination */}
        {totalItems > 0 && (
          <div className="figma-table-footer">
            <span className="footer-count">
              Showing {startIndex + 1} to {endIndex} of {totalItems} applicants
            </span>

            <div className="pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`pagination-num ${
                    safeCurrentPage === pageNum ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className={`pagination-btn ${
                  safeCurrentPage < totalPages ? "active-next" : ""
                }`}
                disabled={safeCurrentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {applicantToDelete && (
        <div className="modal-backdrop" onClick={() => setApplicantToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Applicant</h3>
            <p>
              Are you sure you want to permanently delete{" "}
              <strong>
                {applicantToDelete.full_name ||
                  `${applicantToDelete.first_name || ""} ${applicantToDelete.last_name || ""}`.trim() ||
                  "this applicant"}
              </strong>
              ? This will remove all associated records, resumes, and matches. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setApplicantToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleExecuteDelete}
              >
                Delete Applicant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}