import { useMemo, useState } from "react";
import "../admin_styling/FullCapacityPanel.css";
import MentorProfile from "./MentorProfile";
import { normalizeMentor, getStatus } from "./mentorUtils";

const ITEMS_PER_PAGE = 8;

export default function FullCapacityPanel({ 
  title, 
  loading, 
  data = [], 
  selectedMentor, 
  onViewMentor,
  onBackToList 
}) {
  const safeData = Array.isArray(data) ? data : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All Industries");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [sortOrder, setSortOrder] = useState("Open Slots: High to Low");
  const [currentPage, setCurrentPage] = useState(1);

  const mentors = useMemo(() => safeData.map(normalizeMentor), [safeData]);

  const uniqueIndustries = useMemo(
    () => Array.from(new Set(mentors.map((m) => m.industry).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [mentors]
  );

  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const result = mentors.filter((m) => {
      const status = getStatus(m);
      const matchesSearch = m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchesIndustry = industryFilter === "All Industries" || m.industry === industryFilter;
      const matchesStatus = statusFilter === "All Statuses" || status.key === statusFilter;
      return matchesSearch && matchesIndustry && matchesStatus;
    });

    return result.sort((a, b) =>
      sortOrder === "Open Slots: High to Low" ? b.openSlots - a.openSlots : a.openSlots - b.openSlots
    );
  }, [mentors, searchTerm, industryFilter, statusFilter, sortOrder]);

  if (selectedMentor) {
    return (
      <MentorProfile
        mentor={selectedMentor}
        onBack={onBackToList}
      />
    );
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
        <h1 className="page-title">{title || "Capacity"}</h1>
        <p className="page-subtitle">Monitor mentor workload and available mentee slots.</p>
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
              placeholder="Search mentors"
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
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="cooldown">Cooldown</option>
          </select>

          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => handleFilterChange(setSortOrder, e.target.value)}
          >
            <option value="Open Slots: High to Low">Open Slots: High to Low</option>
            <option value="Open Slots: Low to High">Open Slots: Low to High</option>
          </select>

          <button type="button" className="find-btn" onClick={() => setCurrentPage(1)}>
            Find
          </button>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "24px" }}>Loading capacity data...</p>
        ) : totalItems === 0 ? (
          <p className="muted" style={{ padding: "24px" }}>No capacity data available.</p>
        ) : (
          <div className="table-responsive">
            <table className="figma-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Industry</th>
                  <th>Current Mentees</th>
                  <th>Max Capacity</th>
                  <th>Open Slots</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((m) => {
                  const status = getStatus(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{m.name}</span>
                          <span className="applicant-email">{m.email}</span>
                        </div>
                      </td>
                      <td><span className="career-text">{m.industry}</span></td>
                      <td><span className="career-text">{m.assignedCount}</span></td>
                      <td><span className="career-text">{m.capacity}</span></td>
                      <td><span className="career-text">{m.openSlots}</span></td>
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
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}