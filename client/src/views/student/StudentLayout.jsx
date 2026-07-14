import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StudentLayout.css";
import umLogo from "../../assets/images/um-small-logo.png";
import bgImage from "../../assets/images/mentor-app-bg.png";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/", icon: "🏠" },
  { label: "Career Form", to: "/student/career-form", icon: "📋" },
  { label: "Meetings", to: "/student/meetings", icon: "📅" },
  { label: "Profile", to: "/student/profile", icon: "👤" },
  { label: "Settings", to: "/student/settings", icon: "⚙️" },
];

export default function StudentLayout() {
  const navigate = useNavigate();

  return (
    <div className="sl-shell">
      <aside className="sl-sidebar">
        <div className="sl-brand">
          <img src={umLogo} alt="UM Logo" className="sl-logo" />
        </div>
        <nav className="sl-nav">
          {NAV_ITEMS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/student/"}
              className={({ isActive }) =>
                `sl-nav-item${isActive ? " sl-nav-item--active" : ""}`
              }
            >
              <span className="sl-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sl-sidebar-footer">
          <button className="sl-logout" onClick={() => navigate("/signin")}>
            <span className="sl-nav-label">Logout</span>
          </button>
        </div>
      </aside>
      <main className="sl-main" style={{ backgroundImage: `url(${bgImage})` }}>
        <Outlet />
      </main>
    </div>
  );
}