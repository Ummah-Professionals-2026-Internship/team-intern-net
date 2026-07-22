import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from '../../context/useAuth';
import "./MentorLayout.css";
import umLogo from "../../assets/images/um-text-logo.png";
import bgImage from "../../assets/images/bg-reverse.png"

import DashIcon from "../../assets/icons/home.svg";
import ReqIcon from "../../assets/icons/requests.svg";
import MeetingIcon from "../../assets/icons/meeting.svg";
import ProfileIcon from "../../assets/icons/person.svg";
import ClockIcon from "../../assets/icons/clock.svg";
// import SettingIcon from "../../assets/icons/settings.svg";
import LogOutIcon from "../../assets/icons/signout.svg";
import { useState } from "react";


{/* change icons*/}
const NAV_ITEMS = [
  { label: "Dashboard", to: "/mentor/dashboard", icon: DashIcon},
  { label: "Requests",  to: "/mentor/requests",  icon: ReqIcon },
  { label: "Meetings",  to: "/mentor/meetings",   icon: MeetingIcon},
  { label: "Availability", to: "/mentor/availability", icon: ClockIcon},
  { label: "Profile",   to: "/mentor/profile",    icon: ProfileIcon },
  // { label: "Settings",  to: "/mentor/settings",   icon: SettingIcon },
];

export default function MentorLayout() {
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();

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
              end={to === "/mentor"}
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
          <button className="ml-logout" onClick={() => setShowLogoutModal(true)}>
              {/* /* add logout icon */}
            <img src={LogOutIcon} className="ml-nav-icon" />
            <span className="ml-nav-label">Logout</span>
          </button>

        </div>


      </aside>

      {showLogoutModal && (
        <div className="ml-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="ml-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ml-modal-svg"> 
              <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 105C84.8528 105 105 84.8528 105 60C105 35.1472 84.8528 15 60 15C35.1472 15 15 35.1472 15 60C15 84.8528 35.1472 105 60 105Z" fill="#FF383C" fillOpacity="0.32" stroke="#FF383C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M71.5879 53.1172L78.9688 60.5L71.5879 67.8828" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M59.2812 60.5H78.9636" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M59.2812 75.9688H49.4375C49.0645 75.9688 48.7069 75.8206 48.4431 75.5569C48.1794 75.2931 48.0312 74.9355 48.0312 74.5625V46.4375C48.0312 46.0645 48.1794 45.7069 48.4431 45.4431C48.7069 45.1794 49.0645 45.0312 49.4375 45.0312H59.2812" stroke="#FF383C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="ml-modal-title">Logout? </h1>
            <p className="ml-modal-subtitle">Are you sure you want to logout?</p>
            <div className="ml-modal-btns">
              <button className="ml-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="ml-btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content area ── style={{backgroundImage: `url(${bgImage})`}} */}
      <main 
        className="ml-main" 
        style={{backgroundImage: `url(${bgImage})`}}

      >
        <Outlet />

      </main>




    </div>
  );
}