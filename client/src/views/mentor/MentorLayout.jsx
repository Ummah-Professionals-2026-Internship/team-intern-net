import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./MentorLayout.css";
import umLogo from "../../assets/images/um-text-logo.png";


{/* change icons*/}
const NAV_ITEMS = [
  { label: "Dashboard", to: "/mentor", icon: "🏠" },
  { label: "Requests",  to: "/mentor/requests",  icon: "📋" },
  { label: "Meetings",  to: "/mentor/meetings",   icon: "📅" },
  { label: "Availability", to: "/mentor/availability", icon: "🕐" },
  { label: "Profile",   to: "/mentor/profile",    icon: "👤" },
  { label: "Settings",  to: "/mentor/settings",   icon: "⚙️" },
];

export default function MentorLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Replace with your actual logout logic (clear tokens, context, etc.)
    navigate("/signin");
  };

  return (
    <div className="ml-shell">
      {/* ── Sidebar ── */}
      <aside className="ml-sidebar">
        {/* Logo / brand */}
        <div className="ml-brand">
          <div className="ml-brand-icon" style={{ backgroundImage: `url(${umLogo})` }} />
        </div>

        {/* Nav links */}
        <nav className="ml-nav">
          {NAV_ITEMS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/mentor"}
              className={({ isActive }) =>
                `ml-nav-item${isActive ? " ml-nav-item--active" : ""}`
              }
            >
              {/* <span className="ml-nav-icon">{icon}</span> */}
              <span className="ml-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout pinned to bottom */}
        <button className="ml-logout" onClick={handleLogout}>
            {/* /* add logout icon */}
          {/* <span className="ml-nav-icon">↩</span> */}
          <span className="ml-nav-label">Logout</span>
        </button>

        {/* Decorative wave at bottom */}
        <div className="ml-sidebar-wave" aria-hidden="true" />
      </aside>

      {/* ── Main content area ── */}
      <main className="ml-main">
        <Outlet />
      </main>
    </div>
  );
}