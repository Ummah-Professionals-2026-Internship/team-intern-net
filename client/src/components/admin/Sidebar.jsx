import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Icon from "../ui/Icon";
import umLogo from "../../assets/horizontal white 1.svg";
import sideBgSwirl from "../../assets/horizontal-swirl.svg";
import { useAuth } from "../../context/useAuth";
import '../admin_styling/Sidebar.css';

const NAV_ITEMS = [
  { key: "home", label: "Dashboard" },
  { key: "applicants", label: "Applicants" },
  {
    key: "mentors",
    label: "Mentors",
    children: [
      { key: "mentors", label: "All Mentors" },
      { key: "applications", label: "Advisor Applications" },
    ],
  },
  { key: "match", label: "Match", },
  { key: "meetings", label: "Meetings" },
  { key: "capacity", label: "Capacity" },
];

function isParentActive(item, activeTab) {
  if (!item.children) return activeTab === item.key;
  return item.children.some((child) => child.key === activeTab);
}

export default function Sidebar({ activeTab, setActiveTab, setSelectedApplicant, setSelectedMentor }) {
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Keep whichever group contains the active tab expanded on load/refresh
  const initiallyExpanded = NAV_ITEMS.find(
    (item) => item.children && isParentActive(item, activeTab)
  )?.key;
  const [expandedKey, setExpandedKey] = useState(initiallyExpanded || null);

  const handleParentClick = (item) => {
    // Parents with children just toggle the dropdown — they aren't a
    // navigable destination themselves.
    if (item.children) {
      setExpandedKey((prev) => (prev === item.key ? null : item.key));
      return;
    }
    setExpandedKey(null);
    setActiveTab(item.key);
    setSelectedApplicant(null);
    if (setSelectedMentor) setSelectedMentor(null);
  };

  const handleChildClick = (child) => {
    setActiveTab(child.key);
    setSelectedApplicant(null);
    if (setSelectedMentor) setSelectedMentor(null);
  };

  return (
    <aside className="admin-sidebar">
      <img src={umLogo} alt="Ummah Professionals" className="sidebar-logo" />
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = isParentActive(item, activeTab);
          const expanded = expandedKey === item.key;

          return (
            <div key={item.key} className="nav-item-group">
              <button
                type="button"
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => handleParentClick(item)}
                aria-expanded={item.children ? expanded : undefined}
              >
                <Icon name={item.key} />
                <span>{item.label}</span>
                {item.children && (
                  <ChevronDown
                    size={16}
                    className={`nav-chevron${expanded ? " nav-chevron--open" : ""}`}
                  />
                )}
              </button>

              {item.children && expanded && (
                <div className="nav-submenu">
                  {item.children.map((child) => (
                    <button
                      key={child.key}
                      type="button"
                      className={`nav-subitem${activeTab === child.key ? " active" : ""}`}
                      onClick={() => handleChildClick(child)}
                    >
                      <span>{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={() => setShowLogoutModal(true)}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>

      <img src={sideBgSwirl} className="sidebar-bg-swirl" alt="" />

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
            <h1 className="ml-modal-title">Confirm Logout</h1>
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
    </aside>
  );
}