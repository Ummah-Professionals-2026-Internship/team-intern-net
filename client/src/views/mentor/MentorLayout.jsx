import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./MentorLayout.css";
import umLogo from "../../assets/images/um-text-logo.png";
import bgImage from "../../assets/images/bg-reverse.png"

import DashIcon from "../../assets/icons/home.svg";
import ReqIcon from "../../assets/icons/requests.svg";
import MeetingIcon from "../../assets/icons/meeting.svg";
import ProfileIcon from "../../assets/icons/person.svg";
import ClockIcon from "../../assets/icons/clock.svg";
import SettingIcon from "../../assets/icons/settings.svg";
import LogOutIcon from "../../assets/icons/signout.svg";


{/* change icons*/}
const NAV_ITEMS = [
  { label: "Dashboard", to: "/mentor/", icon: DashIcon},
  { label: "Requests",  to: "/mentor/requests",  icon: ReqIcon },
  { label: "Meetings",  to: "/mentor/meetings",   icon: MeetingIcon},
  { label: "Availability", to: "/mentor/availability", icon: ClockIcon},
  { label: "Profile",   to: "/mentor/profile",    icon: ProfileIcon },
  { label: "Settings",  to: "/mentor/settings",   icon: SettingIcon },
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
        <div className="ml-brand" >
          <img src={umLogo} alt="UM Logo" className="ml-logo" />
        </div>

        {/* Nav links */}
        <nav className="ml-nav">
          {NAV_ITEMS.map(({ label, to, icon}) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/mentor/"}
              className={({ isActive }) =>
                `ml-nav-item${isActive ? " ml-nav-item--active" : ""}`
              }
            >
              <img src={icon} alt="" className="ml-nav-icon"/>
              <span className="ml-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-sidebar-footer">
          {/* Logout pinned to bottom */}
          <button className="ml-logout" onClick={handleLogout}>
              {/* /* add logout icon */}
            <img src={LogOutIcon} className="ml-nav-icon" />
            <span className="ml-nav-label">Logout</span>
          </button>

        </div>


      </aside>

      {/* ── Main content area ── style={{backgroundImage: `url(${bgImage})`}} */}
      <main className="ml-main" >
        <img src={bgImage} alt="" className="ml-main-bgImage"/>
        <Outlet />

      </main>
    </div>
  );
}