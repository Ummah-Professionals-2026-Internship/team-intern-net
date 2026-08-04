import { useMemo, useState } from "react";
import api from "../../api/api";
import "../admin_styling/MeetingsPanel.css";
import "../admin_styling/AssignmentsPanel.css";

const ITEMS_PER_PAGE = 8;

const SERVICE_LABELS = {
  resume_review: "Resume Review",
  resume: "Resume Review",
  mock_interview: "Mock Interview",
  interview: "Mock Interview",
  career_advice: "General Career Advice",
  advice: "General Career Advice",
  healthcare_service: "Healthcare Service",
  mentorship_program: "Mentorship Program",
};

function formatServiceLabel(raw) {
  if (!raw) return "N/A";
  const lower = raw.toLowerCase().replace(/_/g, " ").trim();
  return SERVICE_LABELS[raw] || SERVICE_LABELS[lower.replace(/ /g, "_")] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusMeta(rawStatus) {
  const key = (rawStatus || "").toLowerCase();
  if (key.includes("cancel")) return { key: "cancelled", label: "Cancelled" };
  if (key.includes("decline")) return { key: "declined", label: "Declined" };
  if (key.includes("complet")) return { key: "completed", label: "Completed" };
  if (key.includes("active")) return { key: "active", label: "Active" };
  if (key.includes("pending")) return { key: "pending", label: "Pending" };
  return { key: "upcoming", label: rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "Scheduled" };
}

function normalizeItem(item) {
  // Can be a Meeting object or a MentorAssignment object
  const isMeeting = Boolean(item.start_datetime || item.scheduled_at || item.meeting_time || item.slot_id);

  let assignment = isMeeting ? (item.assignment || {}) : item;
  let studentUser = assignment.student?.user || {};
  let intakeForm = assignment.intake_form || {};
  let mentorUser = assignment.mentor?.user || {};

  const applicantName = item.applicant_name || studentUser.full_name || intakeForm.full_name || "N/A";
  const applicantEmail = item.applicant_email || studentUser.email || intakeForm.email || "N/A";
  const mentorName = item.mentor_name || mentorUser.full_name || "N/A";
  const mentorEmail = item.mentor_email || mentorUser.email || "N/A";

  const startDt = item.start_datetime || item.scheduled_at || item.meeting_time || item.start_time || null;
  const meetingUrl = item.meeting_url || item.zoom_url || item.url || (item.meetings && item.meetings[0]?.meeting_url) || null;
  const meetingId = isMeeting ? item.id : (item.meetings && item.meetings[0]?.id) || null;
  const assignmentId = assignment.id || item.id;

  const rawStatus = item.status || assignment.status || "pending";

  return {
    id: item.id || `item-${assignmentId}-${meetingId}`,
    meetingId,
    assignmentId,
    rawItem: item,
    intakeForm,
    applicantName,
    applicantEmail,
    mentorName,
    mentorEmail,
    service: formatServiceLabel(intakeForm.service_type || item.service || item.service_requested),
    startDt,
    meetingUrl,
    status: getStatusMeta(rawStatus),
    isMeeting,
    assignedAt: assignment.assigned_at || item.assigned_at,
  };
}

export default function MeetingsPanel({ title, loading, data = [], assignments = [], onRefresh, onReassign }) {
  // Combine data props (meetings + assignments)
  const safeData = useMemo(() => {
    const arr = [];
    if (Array.isArray(data) && data.length > 0) {
      arr.push(...data);
    }
    if (Array.isArray(assignments) && assignments.length > 0) {
      // Add assignments that are not already present in meetings list
      const existingAssignmentIds = new Set(data.map((m) => m.assignment_id || m.assignment?.id).filter(Boolean));
      assignments.forEach((a) => {
        if (!existingAssignmentIds.has(a.id)) {
          arr.push(a);
        }
      });
    }
    return arr;
  }, [data, assignments]);

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [sortOrder, setSortOrder] = useState("Upcoming First");
  const [currentPage, setCurrentPage] = useState(1);

  const [generatingId, setGeneratingId] = useState(null);
  const [linkOverrides, setLinkOverrides] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const items = useMemo(() => safeData.map(normalizeItem), [safeData]);

  const uniqueServices = useMemo(
    () => Array.from(new Set(items.map((m) => m.service).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const now = Date.now();

    const result = items.filter((m) => {
      const matchesSearch =
        m.applicantName.toLowerCase().includes(q) ||
        m.applicantEmail.toLowerCase().includes(q) ||
        m.mentorName.toLowerCase().includes(q) ||
        m.mentorEmail.toLowerCase().includes(q);

      const matchesService = serviceFilter === "All Services" || m.service === serviceFilter;
      const matchesStatus = statusFilter === "All Statuses" || m.status.key === statusFilter.toLowerCase();

      let matchesDate = true;
      if (dateFilter !== "All Dates" && m.startDt) {
        const t = new Date(m.startDt).getTime();
        if (dateFilter === "Upcoming") matchesDate = t >= now;
        if (dateFilter === "Past") matchesDate = t < now;
      }

      return matchesSearch && matchesService && matchesStatus && matchesDate;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.startDt || a.assignedAt || 0).getTime();
      const dateB = new Date(b.startDt || b.assignedAt || 0).getTime();
      return sortOrder === "Upcoming First" ? dateA - dateB : dateB - dateA;
    });
  }, [items, searchTerm, serviceFilter, statusFilter, dateFilter, sortOrder]);

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

  const handleAutoSchedule = async (item) => {
    if (generatingId) return;

    const rowId = item.id;
    setGeneratingId(rowId);

    try {
      let res;
      if (item.meetingId) {
        // Meeting exists -> generate link & send email to both parties
        res = await api.post(`/google/meetings/${item.meetingId}/generate-meet-link`);
      } else if (item.assignmentId) {
        // Assignment exists -> auto schedule meeting & send email to both parties
        res = await api.post(`/google/assignments/${item.assignmentId}/auto-schedule`);
      } else {
        alert("Cannot auto-schedule: Missing meeting or assignment identification.");
        return;
      }

      const meetUrl = res?.data?.meet_url;
      if (meetUrl) {
        setLinkOverrides((prev) => ({ ...prev, [rowId]: meetUrl }));
        alert(`Auto Schedule complete! Meeting link generated and emails automatically sent to both ${item.applicantName} and ${item.mentorName}.`);
      }

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to auto schedule meeting link:", err);
      alert(
        err.response?.data?.detail ||
          "Failed to auto-schedule meeting link. Please try again."
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!assignmentId) return;
    if (!window.confirm("Are you sure you want to remove this mentorship assignment?")) {
      return;
    }
    setDeletingId(assignmentId);
    try {
      await api.delete(`/mentor-assignments/${assignmentId}`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      alert(err.response?.data?.detail || "Failed to remove assignment.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="applicant-page-container">
      <div className="page-header">
        <h1 className="page-title">{title || "Mentorship Meetings & Assignments"}</h1>
        <p className="page-subtitle">
          Oversee mentor-student pairings, auto-schedule sessions with meeting links sent to both parties, and manage active assignments.
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
              placeholder="Search by student or mentor name/email"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="figma-search-input"
            />
          </div>

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
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="upcoming">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => handleFilterChange(setSortOrder, e.target.value)}
          >
            <option value="Upcoming First">Newest First</option>
            <option value="Recent First">Oldest First</option>
          </select>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "24px" }}>Loading records...</p>
        ) : totalItems === 0 ? (
          <p className="muted" style={{ padding: "24px" }}>No scheduled meetings or mentorship assignments found.</p>
        ) : (
          <div className="table-responsive">
            <table className="figma-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Mentor</th>
                  <th>Service</th>
                  <th>Date &amp; Time</th>
                  <th>Meeting Link</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((m) => {
                  const d = m.startDt ? new Date(m.startDt) : null;
                  const dateStr = d
                    ? d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : m.assignedAt
                    ? new Date(m.assignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "N/A";
                  const timeStr = d
                    ? d.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "";

                  const effectiveMeetingUrl = linkOverrides[m.id] || m.meetingUrl;
                  const isCancelled = m.status.key === "cancelled";
                  const isDeclined = m.status.key === "declined";
                  const isGenerating = generatingId === m.id;

                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{m.applicantName}</span>
                          <span className="applicant-email">{m.applicantEmail}</span>
                        </div>
                      </td>
                      <td>
                        <div className="applicant-cell">
                          <span className="applicant-name">{m.mentorName}</span>
                          <span className="applicant-email">{m.mentorEmail}</span>
                        </div>
                      </td>
                      <td><span className="career-text">{m.service}</span></td>
                      <td>
                        <span className="date-text">{dateStr} {timeStr && `at ${timeStr}`}</span>
                      </td>
                      <td>
                        <div className="details-cell">
                          {effectiveMeetingUrl ? (
                            <a
                              href={effectiveMeetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="meeting-url-link"
                              style={{ display: "inline-block", fontSize: "13px", color: "#3b82f6", fontWeight: "500" }}
                            >
                              Join Meeting 🔗
                            </a>
                          ) : (
                            <span className="muted" style={{ fontSize: "12px" }}>No link attached</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`meeting-status-pill meeting-status-${m.status.key} status-${m.status.key}`}>
                          {m.status.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell" style={{ justifyContent: "flex-end", gap: "8px" }}>
                          {/* Auto Schedule Button */}
                          {m.status.key !== "declined" && (
                            <button
                              type="button"
                              className="figma-view-btn"
                              disabled={isCancelled || isGenerating || Boolean(effectiveMeetingUrl)}
                              style={{
                                backgroundColor: effectiveMeetingUrl ? "#059669" : "#3b82f6",
                                color: "#ffffff",
                                border: "none",
                                fontWeight: "600",
                              }}
                              title={
                                isCancelled
                                  ? "Cannot schedule for a cancelled item"
                                  : effectiveMeetingUrl
                                  ? "Meeting link sent to both parties via email"
                                  : "Auto schedule and email Google Meet link to both student & mentor"
                              }
                              onClick={() => handleAutoSchedule(m)}
                            >
                              {isGenerating
                                ? "Auto Scheduling..."
                                : effectiveMeetingUrl
                                ? "Link Sent ✓"
                                : "Auto Schedule"}
                            </button>
                          )}

                          {onReassign && (
                            <button
                              type="button"
                              className="figma-view-btn"
                              onClick={() => onReassign(m.intakeForm || { id: m.rawItem.intake_form_id })}
                            >
                              Reassign
                            </button>
                          )}

                          {m.assignmentId && (
                            <button
                              type="button"
                              className="btn-danger-outline"
                              disabled={deletingId === m.assignmentId}
                              onClick={() => handleDeleteAssignment(m.assignmentId)}
                            >
                              Remove
                            </button>
                          )}
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
              Showing {startIndex + 1} to {endIndex} of {totalItems} items
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