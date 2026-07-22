import { useEffect, useState } from "react";
import api from "../../api/api";
import "./AdminDash.css";
import umLogo from "../../assets/horizontal white 1.svg";
import sideBgSwirl from "../../assets/horizontal-swirl.svg";
import bgDoubleSwirl from "../../assets/images/double-white-swirl.png";
import { useAuth } from "../../context/useAuth";

// SVG Icon Helper supporting standard 24x24 or custom viewboxes
const Icon = ({ name, className = "nav-icon" }) => {
  const iconConfig = ICONS[name];
  if (!iconConfig) return null;

  const isCustomConfig = typeof iconConfig === "object" && iconConfig.path;
  const path = isCustomConfig ? iconConfig.path : iconConfig;
  const viewBox = isCustomConfig ? iconConfig.viewBox : "0 0 24 24";

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {typeof path === "string" ? <path d={path} /> : path}
    </svg>
  );
};

// Standardized SVG Paths
const ICONS = {
  home: "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z",
  applicants: (
    <>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  mentors: (
    <>
      <path d="M22 10l-10-5L2 10l10 5 10-5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
      <path d="M22 10v6" />
    </>
  ),
  match: (
    <>
      <path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      <path d="M12 7l1 2 2.2.3-1.6 1.6.4 2.1-2-1-2 1 .4-2.1L8.8 9.3l2.2-.3 1-2z" />
    </>
  ),
  meetings: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.5" />
    </>
  ),
  capacity: {
    viewBox: "0 0 34 34",
    path: "M12.75 15.5834V28.3334M12.75 15.5834H6.51611C5.72271 15.5834 5.3264 15.5834 5.02336 15.7378C4.75679 15.8736 4.54023 16.0902 4.40441 16.3568C4.25 16.6598 4.25 17.0568 4.25 17.8502V28.3334H12.75M12.75 15.5834V7.93355C12.75 7.14015 12.75 6.74315 12.9044 6.4401C13.0402 6.17354 13.2568 5.95698 13.5234 5.82116C13.8264 5.66675 14.2227 5.66675 15.0161 5.66675H18.9828C19.7762 5.66675 20.1737 5.66675 20.4768 5.82116C20.7433 5.95698 20.9592 6.17354 21.0951 6.4401C21.2495 6.74315 21.25 7.14015 21.25 7.93355V11.3334M12.75 28.3334H21.25M21.25 28.3334L29.75 28.3336V13.6002C29.75 12.8068 29.7495 12.4098 29.5951 12.1068C29.4592 11.8402 29.2442 11.6236 28.9776 11.4878C28.6746 11.3334 28.2767 11.3334 27.4833 11.3334H21.25M21.25 28.3334V11.3334",
  },
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

// Sidebar Navigation Items
const NAV_ITEMS = [
  { key: "home", label: "Dashboard" },
  { key: "applicants", label: "Applicants" },
  { key: "mentors", label: "Mentors" },
  { key: "match", label: "Match" },
  { key: "meetings", label: "Meetings" },
  { key: "capacity", label: "Capacity" },
];

export default function AdminDash() {
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const [capacity, setCapacity] = useState([]);
  const [loadingCapacity, setLoadingCapacity] = useState(true);

  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);

  const [activeTab, setActiveTab] = useState("home");
  const { logout } = useAuth();

  useEffect(() => {
    // Fetch Mentors list
    api
      .get("/mentors")
      .then((res) => setMentors(res.data))
      .catch(() => setMentors([]))
      .finally(() => setLoadingMentors(false));

    // Fetch Capacity Tracking
    api
      .get("/mentors/capacity")
      .then((res) => setCapacity(res.data))
      .catch(() => setCapacity([]))
      .finally(() => setLoadingCapacity(false));

    // Fetch Student Intake Applicants
    api
      .get("/intake")
      .then((res) => {
        const payload = res?.data ?? res;
        console.log("Resolved Intake Payload:", payload);
        
        const dataArray = payload?.intake_forms || payload?.applicants || payload;
        setApplicants(Array.isArray(dataArray) ? dataArray : []);
      })
      .catch((err) => {
        console.error("Failed to load applicants:", err);
        setApplicants([]);
      })
      .finally(() => setLoadingApplicants(false));
  }, []);

  return (
    <div className="admin-dash">
      {/* SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <img src={umLogo} alt="Ummah Professionals" className="sidebar-logo" />
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item${activeTab === item.key ? " active" : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <Icon name={item.key} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={logout}>
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>
        
        {/* SIDEBAR BACKGROUND SWIRL */}
        <img src={sideBgSwirl} className="sidebar-bg-swirl" alt="" />
      </aside>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="admin-main">
        {/* MAIN PANEL BACKGROUND DOUBLE SWIRL */}
        <img src={bgDoubleSwirl} className="main-bg-swirl" alt="" />

        <h1 className="admin-title">Welcome Back, Admin!</h1>

        {activeTab === "mentors" ? (
          <FullMentorsPanel
            title="All Mentors"
            loading={loadingMentors}
            data={mentors.length ? mentors : capacity}
          />
        ) : activeTab === "capacity" ? (
          <FullCapacityPanel
            title="Mentor Capacity Tracking"
            loading={loadingCapacity}
            data={capacity}
          />
        ) : activeTab === "applicants" ? (
          <FullApplicantPanel
            title="All Student Applicants"
            loading={loadingApplicants}
            data={applicants}
          />
        ) : (
          /* DEFAULT DASHBOARD GRID */
          <>
            {/* TOP STAT CARDS */}
            <div className="stat-cards">
              <StatCard
                iconKey="applicants"
                variant="blue"
                value={loadingApplicants ? "--" : applicants.length}
                label="Total Applicants"
                linkText="View All Applicants"
                onClick={() => setActiveTab("applicants")}
              />
              <StatCard
                iconKey="mentors"
                variant="teal"
                value={loadingMentors && loadingCapacity ? "--" : mentors.length || capacity.length}
                label="Total Mentors"
                linkText="View All Mentors"
                onClick={() => setActiveTab("mentors")}
              />
              <StatCard
                iconKey="match"
                variant="purple"
                value="--"
                label="Matches Pending"
                linkText="View Pending Matches"
                disabled
              />
              <StatCard
                iconKey="meetings"
                variant="yellow"
                value="--"
                label="Meetings"
                linkText="View Scheduled Meetings"
                disabled
              />
            </div>

            {/* DASHBOARD PANELS GRID */}
            <div className="panel-grid">
              {/* Recent Applicants Panel */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="applicants" className="panel-icon icon-blue" />
                  <h2>Recent Applicants</h2>
                </div>
                {loadingApplicants ? (
                  <p className="muted">Loading applicants...</p>
                ) : applicants.length === 0 ? (
                  <p className="muted">No recent applicants found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.slice(0, 3).map((app) => {
                        const isAssigned = app.is_assigned || app.status === "assigned";
                        return (
                          <tr key={app.id || app.student_id || app.email}>
                            <td>{app.full_name || `${app.first_name || ''} ${app.last_name || ''}`}</td>
                            <td>
                              <span className={`status-pill ${isAssigned ? "booked" : "available"}`}>
                                {isAssigned ? "Assigned" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <a
                  className="view-all-link"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("applicants");
                  }}
                >
                  View All Applicants
                </a>
              </section>

              {/* Mentor Capacity Tracking Panel */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="capacity" className="panel-icon icon-pink" />
                  <h2>Mentor Capacity Tracking</h2>
                </div>
                {loadingCapacity ? (
                  <p className="muted">Loading mentors...</p>
                ) : capacity.length === 0 ? (
                  <p className="muted">No mentors found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Mentor</th>
                        <th>Capacity (Meetings)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacity.slice(0, 3).map((m) => (
                        <tr key={m.mentor_user_id || m.id}>
                          <td>{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`}</td>
                          <td>{m.assigned_count}/{m.capacity}</td>
                          <td>
                            <span className={`status-pill ${m.at_capacity ? "booked" : m.has_active_assignment ? "booked" : "available"}`}>
                              {m.at_capacity ? "Cooldown" : m.has_active_assignment ? "Booked" : "Available"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <a
                  className="view-all-link"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("capacity");
                  }}
                >
                  View All Capacity
                </a>
              </section>

              {/* Pending Matches Panel */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="match" className="panel-icon icon-purple" />
                  <h2>Pending Matches</h2>
                </div>
                <EmptyPanel note="No matching endpoint connected yet" />
              </section>

              {/* Upcoming Meetings Panel */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="meetings" className="panel-icon icon-yellow" />
                  <h2>Upcoming Meetings</h2>
                </div>
                <EmptyPanel note="No meetings-list endpoint connected yet" />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* SUBCOMPONENTS PANEL SECTIONS */

function FullMentorsPanel({ title, loading, data }) {
  return (
    <section className="panel full-page-panel">
      <div className="panel-header">
        <Icon name="mentors" className="panel-icon icon-teal" />
        <h2>{title}</h2>
      </div>
      {loading ? (
        <p className="muted">Loading mentors...</p>
      ) : data.length === 0 ? (
        <p className="muted">No mentors available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Mentor Name</th>
              <th>Email</th>
              <th>Industry / Field</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id || m.mentor_user_id}>
                <td>{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`}</td>
                <td>{m.email || "N/A"}</td>
                <td>{m.industry || m.field || "General"}</td>
                <td>
                  <span className={`status-pill ${m.is_active === false ? "booked" : "available"}`}>
                    {m.is_active === false ? "Inactive" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function FullCapacityPanel({ title, loading, data }) {
  return (
    <section className="panel full-page-panel">
      <div className="panel-header">
        <Icon name="capacity" className="panel-icon icon-pink" />
        <h2>{title}</h2>
      </div>
      {loading ? (
        <p className="muted">Loading capacity data...</p>
      ) : data.length === 0 ? (
        <p className="muted">No capacity data available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Mentor Name</th>
              <th>Assigned / Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.mentor_user_id || m.id}>
                <td>{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`}</td>
                <td>{m.assigned_count ?? 0} / {m.capacity ?? 0}</td>
                <td>
                  <span className={`status-pill ${m.at_capacity ? "booked" : m.has_active_assignment ? "booked" : "available"}`}>
                    {m.at_capacity ? "Cooldown" : m.has_active_assignment ? "Booked" : "Available"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function FullApplicantPanel({ title, loading, data }) {
  return (
    <section className="panel full-page-panel">
      <div className="panel-header">
        <Icon name="applicants" className="panel-icon icon-blue" />
        <h2>{title}</h2>
      </div>
      {loading ? (
        <p className="muted">Loading applicants...</p>
      ) : data.length === 0 ? (
        <p className="muted">No student applications submitted yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((app) => {
              const isAssigned = app.is_assigned || app.status === "assigned";
              return (
                <tr key={app.id || app.student_id || app.email}>
                  <td>{app.full_name || `${app.first_name || ''} ${app.last_name || ''}`}</td>
                  <td>
                    <span className={`status-pill ${isAssigned ? "booked" : "available"}`}>
                      {isAssigned ? "Assigned" : "Pending"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function StatCard({ iconKey, variant, value, label, linkText, disabled, onClick }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon-bg bg-${variant}`}>
          <Icon name={iconKey} className={`card-icon text-${variant}`} />
        </div>
        <div className="stat-card-info">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      <a
        className={`view-all-link${disabled ? " disabled" : ""}`}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (!disabled && onClick) onClick();
        }}
      >
        {linkText}
      </a>
    </div>
  );
}

function EmptyPanel({ note }) {
  return <p className="muted">{note}</p>;
}