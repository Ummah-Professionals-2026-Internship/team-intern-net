import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
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
  const { user: authUser } = useAuth();
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/mentor/profile");
        setProfile(res.data);
        setMeetingLink(res.data.meeting_url || "");
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
            <span className="mp-avatar-initials">
              {profile?.user?.full_name?.charAt(0) || "M"}
            </span>
          </div>
          <div className="mp-identity-info">
            <h2 className="mp-identity-name">{profile?.user?.full_name}</h2>
            <p className="mp-identity-email">{profile?.user?.email}</p>
            <span className="mp-role-badge">Mentor</span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="mp-card">
          <h3 className="mp-card-title">Personal Information</h3>
          <div className="mp-grid">
            {editMode ? (
              <>
                <EditField label="Full Name"    name="full_name"    value={form.full_name}    onChange={handleChange} />
                <EditField label="Email"        name="email"        value={profile?.user?.email} disabled />
                <EditField label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="(555) 000-0000" />
                <EditField label="Gender"       name="gender"       value={profile?.user?.gender === "m" ? "Male" : profile?.user?.gender === "f" ? "Female" : "—"} disabled />
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
                <DisplayField label="Phone Number" value={profile?.phone_number} />
                <DisplayField label="Gender"       value={profile?.user?.gender === "m" ? "Male" : profile?.user?.gender === "f" ? "Female" : "—"} />
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
            <h3 className="mp-card-title">Professional Background</h3>
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
            <h3 className="mp-card-title">Services</h3>

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
          <h3 className="mp-card-title">Summary</h3>
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
            <h3 className="mp-card-title">Mentorship Meeting Link</h3>
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
            <h3 className="mp-card-title">LinkedIn</h3>
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