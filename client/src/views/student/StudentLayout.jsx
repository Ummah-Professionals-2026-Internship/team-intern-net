import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth"; // 👈 Integrated Auth context for clean system logout
import "./StudentLayout.css";
import umLogo from "../../assets/images/um-text-logo.png";
import bgImage from "../../assets/images/bg-reverse.png"
import DashIcon from "../../assets/icons/home.svg";
import MeetingIcon from "../../assets/icons/meeting.svg";
import ProfileIcon from "../../assets/icons/person.svg";
// import SettingIcon from "../../assets/icons/settings.svg";
import LogOutIcon from "../../assets/icons/signout.svg";
import RequestsIcon from "../../assets/icons/requests.svg";
import sideBgSwirl from "../../assets/horizontal-swirl.svg";

// Fixed to match the exact paths configured in routes.jsx
const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/dashboard", icon: DashIcon },
  { label: "Career Form", to: "/prep", icon: RequestsIcon },
  { label: "Meetings", to: "/student/meetings", icon: MeetingIcon },
  { label: "Profile", to: "/student/profile", icon: ProfileIcon },
];

export default function StudentLayout() {
  const { logout } = useAuth(); // 👈 Pull secure logout function 

  return (
    <div className="sl-shell">
      <aside className="sl-sidebar">
        <div className="sl-brand">
          <img src={umLogo} alt="UM Logo" className="sl-logo" />
        </div>
        <nav className="sl-nav">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sl-nav-item${isActive ? " sl-nav-item--active" : ""}`
              }
            >
              <img src={icon} alt="" className="sl-nav-icon" />
              <span className="sl-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <img src={sideBgSwirl} className="sl-sidebar-bg-swirl" alt="" />

        <div className="sl-sidebar-footer">
          {/* Scrub storage context on logout */}
          <button className="sl-logout" onClick={logout}>
            <img src={LogOutIcon} alt="" className="sl-nav-icon" />
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
