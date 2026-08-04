import { useState, useMemo, useEffect, useRef } from "react";
import MentorProfile from "./MentorProfile";
import { normalizeMentor, getStatus } from "./mentorUtils";
import "../admin_styling/FullMentorsPanel.css";

export default function FullMentorsPanel({
  loading,
  data = [],
  selectedMentor,
  onViewMentor,
  onBackToList,
  onUpdateMentor,
  onDeleteMentor,
}) {
  const ITEMS_PER_PAGE = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [industryFilter, setIndustryFilter] = useState("All Industries");
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [currentPage, setCurrentPage] = useState(1);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [mentorToDelete, setMentorToDelete] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeData = Array.isArray(data) ? data : [];
  const mentors = useMemo(() => safeData.map(normalizeMentor), [safeData]);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const confirmDelete = (mentor) => {
    setOpenMenuId(null);
    setMentorToDelete(mentor);
  };

  const handleExecuteDelete = () => {
    if (mentorToDelete && onDeleteMentor) {
      onDeleteMentor(mentorToDelete.raw);
    }
    setMentorToDelete(null);
  };

  const uniqueIndustries = useMemo(() => {
    const industries = new Set();
    mentors.forEach((m) => {
      if (m.industry && m.industry !== "N/A") industries.add(m.industry.trim());
    });
    return Array.from(industries).sort((a, b) => a.localeCompare(b));
  }, [mentors]);

  const uniqueServices = useMemo(() => {
    const services = new Set();
    mentors.forEach((m) => m.servicesOffered.forEach((s) => services.add(s)));
    return Array.from(services).sort((a, b) => a.localeCompare(b));
  }, [mentors]);

  const filteredData = useMemo(() => {
    let result = mentors.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());

      const status = getStatus(m);
      const matchesStatus =
        statusFilter === "All Statuses" || status.label.toLowerCase().includes(statusFilter.toLowerCase());

      const matchesIndustry = industryFilter === "All Industries" || m.industry === industryFilter;

      const matchesService =
        serviceFilter === "All Services" || m.servicesOffered.includes(serviceFilter);

      return matchesSearch && matchesStatus && matchesIndustry && matchesService;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.raw.created_at || a.raw.joined_at || 0);
      const dateB = new Date(b.raw.created_at || b.raw.joined_at || 0);
      return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });
  }, [mentors, searchTerm, statusFilter, industryFilter, serviceFilter, sortOrder]);

  if (selectedMentor) {
    return <MentorProfile mentor={selectedMentor} onBack={onBackToList} />;
  }

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentTableData = filteredData.slice(startIndex, endIndex);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="applicant-page-container">
      <div className="page-header">
        <h1 className="page-title">Mentors</h1>
        <p className="page-subtitle">View and manage all career advisors.</p>
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
              placeholder="Search mentors by name, email, employer, or job title"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="figma-search-input"
            />
          </div>

          <select
            className="filter-select"
            value={industryFilter}
            onChange={(e) => handleFilterChange(setIndustryFilter, e.target.value)}
          >
            <option value="All Industries">All Industries</option>
            {uniqueIndustries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={serviceFilter}
            onChange={(e) => handleFilterChange(setServiceFilter, e.target.value)}
          >
            <option value="All Services">All Services</option>
            {uniqueServices.map((svc) => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Booked">Booked</option>
            <option value="At Capacity">At Capacity</option>
            <option value="Cooldown">Cooldown</option>
          </select>

          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => handleFilterChange(setSortOrder, e.target.value)}
          >
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
          </select>

          <button type="button" className="find-btn" onClick={() => setCurrentPage(1)}>
            Find
          </button>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "24px" }}>Loading mentors...</p>
        ) : totalItems === 0 ? (
          <p className="muted" style={{ padding: "24px" }}>No mentor records found.</p>
        ) : (
          <div className="table-responsive">
            <table className="figma-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Job Title</th>
                  <th>Industry</th>
                  <th>Services Offered</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((m, index) => {
                  const status = getStatus(m);
                  const itemKey = m.id || `mentor-${startIndex + index}`;

                  return (
                    <tr key={itemKey}>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{m.name}</span>
                          <span className="applicant-email">{m.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="career-text">{m.jobTitle}</span>
                      </td>
                      <td>
                        <span className="career-text">{m.industry}</span>
                      </td>
                      <td>
                        <div className="service-pill-group">
                          {m.servicesOffered.length > 0 ? (
                            m.servicesOffered.map((svc) => (
                              <span key={svc} className="service-pill">{svc}</span>
                            ))
                          ) : (
                            <span className="service-pill service-pill-empty">N/A</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="career-text">{m.assignedCount}/{m.capacity}</span>
                      </td>
                      <td>
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            type="button"
                            className="figma-view-btn"
                            onClick={() => onViewMentor?.(m.raw)}
                          >
                            View Mentor
                          </button>

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

                            {openMenuId === itemKey && (
                              <div className="options-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item delete-item"
                                  onClick={() => confirmDelete(m)}
                                >
                                  🗑️ Delete Mentor
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

        {totalItems > 0 && (
          <div className="figma-table-footer">
            <span className="footer-count">
              Showing {startIndex + 1} to {endIndex} of {totalItems} mentors
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

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`pagination-num ${safeCurrentPage === pageNum ? "active" : ""}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className={`pagination-btn ${safeCurrentPage < totalPages ? "active-next" : ""}`}
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {mentorToDelete && (
        <div className="modal-backdrop" onClick={() => setMentorToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Mentor</h3>
            <p>
              Are you sure you want to permanently delete <strong>{mentorToDelete.name}</strong>?
              This will remove all associated accounts, capacity configurations, and active mentor links.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setMentorToDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleExecuteDelete}>
                Delete Mentor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}