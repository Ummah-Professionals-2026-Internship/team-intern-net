import { useState, useEffect } from "react";
// import { useAuth } from "../../context/useAuth";
import api from "../../api/api";
import "./MentorProfile.css";

const INDUSTRY_OPTIONS = [
  "Business", "Education", "Engineering", "Finance", "Healthcare",
  "Information Technology", "Law", "Social Services", "Other",
];

const EXPERIENCE_LEVELS = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Executive (10+ years)",
];

const VOLUNTEERING_OPTIONS = [
  { label: "Healthcare Service",  value: "healthcare_service" },
  { label: "Mentorship Program",  value: "mentorship_program" },
  { label: "General Career Advice", value: "career_advice" },
  { label: "Mock Interview",      value: "mock_interview" },
  { label: "Resume Review",       value: "resume_review" },
];

const SERVICE_LABELS = {
  mock_interview:      "Mock Interview",
  resume_review:       "Resume Review",
  career_advice:       "General Career Advice",
  healthcare_service:  "Healthcare Service",
  mentorship_program:  "Mentorship Program",
};

function DisplayField({ label, value }) {
  return (
    <div className="mp-field">
      <span className="mp-field-label">{label}</span>
      <span className="mp-field-value">{value || "—"}</span>
    </div>
  );
}

function EditField({ label, name, value, onChange, disabled, type = "text", placeholder }) {
  return (
    <div className="mp-field">
      <label className="mp-field-label">{label}</label>
      <input
        className={`mp-input ${disabled ? "mp-input--disabled" : ""}`}
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder || label}
      />
    </div>
  );
}

export default function MentorProfile() {
  // const { user: authUser } = useAuth();
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  // const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/mentor/profile");
        setProfile(res.data);
        // setMeetingLink(res.data.meeting_url || "");
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);


      // meeting_url: profile.meeting_url || "",
  const handleEdit = () => {
    setForm({
      full_name:    profile.user.full_name,
      phone_number: profile.phone_number,
      county:       profile.county,
      state:        profile.state,
      linkedin_url: profile.linkedin_url,
      major:        profile.major,
      alma_mater:   profile.alma_mater,
      employer:     profile.employer,
      job_title:    profile.job_title,
      industry:     profile.industry,
      experience:   profile.experience,
      service_types: profile.service_types || [],
      bio:          profile.bio,
      meeting_url: profile.meeting_url || "", 
    });
    setSaveError("");
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setSaveError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleService = (value) => {
    setForm((prev) => {
      const already = prev.service_types.includes(value);
      return {
        ...prev,
        service_types: already
          ? prev.service_types.filter((s) => s !== value)
          : [...prev.service_types, value],
      };
    });
  };

  const handleSave = async () => {
    if (form.service_types.length === 0) {
      setSaveError("Please select at least one service type.");
      return;
    }

    const cleanedForm = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
        key,
        value === "" ? null : value,
    ])
    );

    setSaving(true);
    setSaveError("");
    try {
      const res = await api.patch("/mentor/profile", cleanedForm);
      setProfile(res.data);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-loading"><div className="mp-spinner" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mp-page">
        <p className="mp-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="mp-page">
      {/* Header */}
      <div className="mp-header">
        <h1 className="mp-title">My Profile</h1>
        <p className="mp-subtitle">View and manage your account information.</p>
      </div>

      <div className="mp-container">

        {/* Identity */}
        <div className="mp-card mp-card--identity">
          <div className="mp-avatar">
            <svg width="90" height="90" viewBox="0 0 117 117" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d_856_1728)">
                <path d="M58.5 102.375C82.7315 102.375 102.375 82.7315 102.375 58.5C102.375 34.2685 82.7315 14.625 58.5 14.625C34.2685 14.625 14.625 34.2685 14.625 58.5C14.625 82.7315 34.2685 102.375 58.5 102.375Z" fill="#8ACBDB" stroke="#007CA6" strokeWidth="1.5" strokeMiterlimit="10"/>
                <path d="M58.5 73.125C68.5965 73.125 76.7812 64.9402 76.7812 54.8438C76.7812 44.7473 68.5965 36.5625 58.5 36.5625C48.4035 36.5625 40.2188 44.7473 40.2188 54.8438C40.2188 64.9402 48.4035 73.125 58.5 73.125Z" stroke="#007CA6" strokeWidth="1.5" strokeMiterlimit="10"/>
                <path d="M29.1577 91.1202C31.9118 85.7053 36.1106 81.1582 41.2893 77.9821C46.4679 74.8061 52.4245 73.125 58.4995 73.125C64.5745 73.125 70.531 74.806 75.7097 77.9821C80.8884 81.1581 85.0872 85.7052 87.8413 91.1201" stroke="#007CA6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            {/* <span className="mp-avatar-initials">
              {profile?.user?.full_name?.charAt(0) || "M"}
            </span> */}
          </div>
          <div className="mp-identity-info">
            <h2 className="mp-identity-name">{profile?.user?.full_name}</h2>
            <p className="mp-identity-email">{profile?.user?.email}</p>
            <span className="mp-role-badge">Mentor</span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="mp-card">
          <div className="mp-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#007CA6" className="bi bi-person" viewBox="0 0 16 16">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
            </svg>
            <h3 className="mp-card-title">Personal Information</h3>

          </div>
        
          <div className="mp-grid">
            {editMode ? (
              <>
                <EditField label="Full Name"    name="full_name"    value={form.full_name}    onChange={handleChange} />
                <EditField label="Email"        name="email"        value={profile?.user?.email} disabled />
                <EditField label="Gender"       name="gender"       value={profile?.user?.gender === "m" ? "Male" : profile?.user?.gender === "f" ? "Female" : "—"} disabled />
                <EditField label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="(555) 000-0000" />
                <EditField label="County"       name="county"       value={form.county}       onChange={handleChange} />
                <EditField label="State"        name="state"        value={form.state}        onChange={handleChange} />
                <EditField label="Major"      name="major"      value={form.major}      onChange={handleChange} />
                <EditField label="Alma Mater" name="alma_mater" value={form.alma_mater} onChange={handleChange} />

                {/* <EditField label="LinkedIn"     name="linkedin_url" value={form.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." /> */}
              </>
            ) : (
              <>
                <DisplayField label="Full Name"    value={profile?.user?.full_name} />
                <DisplayField label="Email"        value={profile?.user?.email} />
                <DisplayField label="Gender"       value={profile?.user?.gender === "m" ? "Male" : profile?.user?.gender === "f" ? "Female" : "—"} />
                <DisplayField label="Phone Number" value={profile?.phone_number} />
                <DisplayField label="County"       value={profile?.county} />
                <DisplayField label="State"        value={profile?.state} />
                <DisplayField label="Major"      value={profile?.major} />
                <DisplayField label="Alma Mater" value={profile?.alma_mater} />

                {/* <DisplayField label="LinkedIn"     value={profile?.linkedin_url} /> */}
              </>
            )}
          </div>
        </div>

        {/* Professional */}
        <div className="mp-card-1">
          <div className="mp-card-2">
          <div className="mp-card-header">
            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.626 8.12109H4.37598C3.89273 8.12109 3.50098 8.52509 3.50098 9.02344V23.4609C3.50098 23.9593 3.89273 24.3633 4.37598 24.3633H23.626C24.1092 24.3633 24.501 23.9593 24.501 23.4609V9.02344C24.501 8.52509 24.1092 8.12109 23.626 8.12109Z" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.375 8.12109V6.31641C18.375 5.83777 18.1906 5.37874 17.8624 5.0403C17.5342 4.70185 17.0891 4.51172 16.625 4.51172H11.375C10.9109 4.51172 10.4658 4.70185 10.1376 5.0403C9.80937 5.37874 9.625 5.83777 9.625 6.31641V8.12109" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M24.5007 14.2468C21.3094 16.1508 17.6866 17.1505 13.9998 17.1446C10.3136 17.1505 6.69135 16.1512 3.50049 14.2478" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6875 13.5352H15.3125" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="mp-card-title">Professional Background</h3>

          </div>
            <div className="mp-grid">
              {editMode ? (
                <>
                  <EditField label="Employer"  name="employer"  value={form.employer}  onChange={handleChange} />
                  <EditField label="Job Title" name="job_title" value={form.job_title} onChange={handleChange} />
                  <div className="mp-field">
                    <label className="mp-field-label">Industry</label>
                    <select className="mp-select" name="industry" value={form.industry || ""} onChange={handleChange}>
                      <option value="">Select industry</option>
                      {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="mp-field">
                    <label className="mp-field-label">Experience Level</label>
                    <select className="mp-select" name="experience" value={form.experience || ""} onChange={handleChange}>
                      <option value="">Select experience level</option>
                      {EXPERIENCE_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <DisplayField label="Employer"        value={profile?.employer} />
                  <DisplayField label="Job Title"       value={profile?.job_title} />
                  <DisplayField label="Industry"        value={profile?.industry} />
                  <DisplayField label="Experience Level" value={profile?.experience} />
                </>
              )}
            </div>
          </div>

          <div className="mp-card-2">
          <div className="mp-card-header">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.3125 27.1875H19.6875" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.22309 19.5716C8.10834 18.7009 7.20544 17.5889 6.58227 16.3191C5.95909 15.0493 5.63185 13.6548 5.62514 12.2403C5.59706 7.15882 9.69375 2.93467 14.7739 2.8151C16.7425 2.76769 18.6761 3.34135 20.3003 4.45468C21.9245 5.56801 23.157 7.1645 23.8228 9.01768C24.4886 10.8709 24.554 12.8866 24.0098 14.7791C23.4655 16.6715 22.3392 18.3446 20.7905 19.5609C20.4494 19.8251 20.1729 20.1635 19.9818 20.5504C19.7907 20.9372 19.6901 21.3625 19.6875 21.794L19.6875 22.4999C19.6875 22.7486 19.5887 22.987 19.4129 23.1629C19.2371 23.3387 18.9987 23.4374 18.75 23.4374H11.25C11.0013 23.4374 10.7629 23.3387 10.5871 23.1629C10.4113 22.987 10.3125 22.7486 10.3125 22.4999L10.3125 21.7932C10.3114 21.3645 10.2128 20.9416 10.024 20.5567C9.83527 20.1718 9.56137 19.8349 9.22309 19.5716V19.5716Z" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.9517 6.65442C17.0984 6.84933 18.1562 7.39548 18.9792 8.21744C19.8022 9.0394 20.3496 10.0966 20.546 11.2431" stroke="#007CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="mp-card-title">Services</h3>

          </div>


            {/* Services */}
            <div className="mp-field mp-field--full">
              <span className="mp-field-label">Services Offered</span>
              {editMode ? (
                <div className="mp-tags">
                  {VOLUNTEERING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`mp-tag ${form.service_types?.includes(opt.value) ? "mp-tag--active" : ""}`}
                      onClick={() => toggleService(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mp-tags">
                  {profile?.service_types?.length > 0
                    ? profile.service_types.map((s) => (
                        <span key={s} className="mp-tag mp-tag--active mp-tag--readonly">
                          {SERVICE_LABELS[s] || s}
                        </span>
                      ))
                    : <span className="mp-field-value">—</span>
                  }
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Bio */}
        <div className="mp-card">
          <div className="mp-card-header">

            <svg width="30" height="30" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.252 23.5016C16.238 24.2046 16.8045 24.7817 17.5076 24.7807C18.2104 24.7797 18.7752 24.2014 18.7595 23.4988L18.5852 15.6725C18.572 15.0803 18.0878 14.6074 17.4954 14.6082C16.9034 14.6091 16.4206 15.083 16.4088 15.6749L16.252 23.5016Z" fill="#007CA6"/>
              <path d="M18.5227 10.6672C18.2354 10.3675 17.891 10.2179 17.4894 10.2185C17.2247 10.2188 16.9843 10.2872 16.7682 10.4235C16.5478 10.5645 16.3716 10.7524 16.2395 10.9871C16.1031 11.2218 16.035 11.4822 16.0355 11.7682C16.0361 12.1903 16.1822 12.5513 16.4739 12.851C16.7612 13.1507 17.1012 13.3003 17.4939 13.2997C17.8955 13.2992 18.2394 13.1486 18.5258 12.848C18.8078 12.5475 18.9485 12.1861 18.9479 11.764C18.9473 11.3326 18.8055 10.9669 18.5227 10.6672Z" fill="#007CA6"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M2.93772 17.5207C2.92608 9.47815 9.43639 2.94897 17.4789 2.93733C25.5214 2.92569 32.0506 9.436 32.0622 17.4785C32.0739 25.521 25.5636 32.0502 17.5211 32.0618C9.47854 32.0735 2.94936 25.5632 2.93772 17.5207ZM5.12206 17.5175C5.11216 10.6814 10.6459 5.13156 17.4821 5.12166C24.3182 5.11177 29.868 10.6455 29.8779 17.4817C29.8878 24.3178 24.354 29.8676 17.5179 29.8775C10.6818 29.8874 5.13195 24.3536 5.12206 17.5175Z" fill="#007CA6"/>
            </svg>
            <h3 className="mp-card-title">Professional Summary</h3>

          </div>

          {/* Bio */}

          <div className="mp-field mp-field--full" style={{ marginTop: "16px" }}>
            {/* <span className="mp-field-label">Bio</span> */}
            {editMode ? (
              <textarea
                className="mp-textarea"
                name="bio"
                value={form.bio || ""}
                onChange={handleChange}
                rows={4}
                placeholder="Tell mentees about yourself..."
              />
            ) : (
              <p className="mp-bio-text">{profile?.bio || "—"}</p>
            )}
          </div>
        </div>

        {/* Mentorship Meeting Link */}
        <div className="mp-card-1">
          <div className="mp-card-2">
         <div className="mp-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#007CA6" className="bi bi-link-45deg" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
            </svg>
            <h3 className="mp-card-title">Mentorship Meeting Link</h3>

          </div>
            <p className="mp-meeting-desc">
              This is the meeting link used for all sessions with your mentees. Only your assigned mentees will be able to access this meeting link.
            </p>
            {editMode ? (
              <div className="mp-meeting-row">
                <input
                  className="mp-input mp-input--meeting"
                  type="url"
                  name="meeting_url"
                  value={form.meeting_url || ""}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            ) : (
              <div className="mp-meeting-row">
                {profile?.meeting_url ? (
                  <button
                    className="mp-btn-open"
                    onClick={() => window.open(profile.meeting_url, "_blank")}
                  >
                    Open Link
                  </button>
                ) : (
                  <span className="mp-field-value">— No meeting link set</span>
                )}
              </div>
            )}

          </div>

          <div className="mp-card-2">
          <div className="mp-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="#007CA6" className="bi bi-linkedin" viewBox="0 0 16 16">
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
            </svg>
            <h3 className="mp-card-title">LinkedIn</h3>

          </div>

            {editMode ? (
              <EditField label="LinkedIn"     name="linkedin_url" value={form.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
            ): (
              <DisplayField label="LinkedIn" value={profile?.linkedin_url} />
            )}

          </div>

        </div>

        {/* Save error */}
        {saveError && <p className="mp-save-error">{saveError}</p>}

        {/* Success toast */}
        {saveSuccess && <div className="mp-toast">Profile updated successfully!</div>}

        {/* Footer buttons */}
        <div className="mp-footer">
          {editMode ? (
            <>
              <button className="mp-btn-cancel" onClick={handleCancel}>Cancel</button>
              <button className="mp-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button className="mp-btn-edit" onClick={handleEdit}>Edit Profile</button>
          )}
        </div>

      </div>
    </div>
  );
}