import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StudentLayout.css";
import umLogo from "../../assets/images/um-small-logo.png";
import bgImage from "../../assets/images/mentor-app-bg.png";
import DashIcon from "../../assets/icons/home.svg";
import MeetingIcon from "../../assets/icons/meeting.svg";
import ProfileIcon from "../../assets/icons/person.svg";
import SettingIcon from "../../assets/icons/settings.svg";
import LogOutIcon from "../../assets/icons/signout.svg";
import RequestsIcon from "../../assets/icons/requests.svg";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/", icon: DashIcon },
  { label: "Career Form", to: "/student/career-form", icon: RequestsIcon },
  { label: "Meetings", to: "/student/meetings", icon: MeetingIcon },
  { label: "Profile", to: "/student/profile", icon: ProfileIcon },
  { label: "Settings", to: "/student/settings", icon: SettingIcon },
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
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/student/"}
              className={({ isActive }) =>
                `sl-nav-item${isActive ? " sl-nav-item--active" : ""}`
              }
            >
              <img src={icon} alt="" className="sl-nav-icon" />
              <span className="sl-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sl-sidebar-footer">
          <button className="sl-logout" onClick={() => navigate("/signin")}>
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