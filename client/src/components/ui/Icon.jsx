import React from "react";

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

  /* NEW ICONS FOR APPLICANT DETAILS PAGE */
  back: "M15 18l-6-6 6-6",
  personal: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8a6 6 0 00-12 0c0 1.6.64 2.83 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0116 0v1" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
      <line x1="9" y1="18" x2="13" y2="18" />
    </>
  ),

};

export default function Icon({ name, className = "nav-icon" }) {
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
}