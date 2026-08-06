import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth"; 
import "./StudentProfile.css";
import api from '../../api/api'; // adjust path as needed

const INDUSTRY_OPTIONS = [
  "Architecture",
  "Business",
  "Education",
  "Engineering",
  "Finance",
  "Healthcare",
  "Information Technology",
  "Law",
  "Social Services",
  "Other",
];

export default function StudentProfile() {
  const { user } = useAuth(); 
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Complete profile state matching the student data blueprint
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    school: "",
    major: "",
    graduation_year: "",
    academic_level: "",
    industry: "",
    desired_career: "",
    service_requested: "",
    comments: ""
  });

  // Fetch profile data from backend with auth context fallbacks
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await api.get("/student/profile");
        const apiData = res.data;

        setFormData({
          full_name: apiData.full_name || user?.full_name || user?.name || "Student User",
          email: apiData.email || user?.email || "",
          school: apiData.school || "",
          major: apiData.major || "Computer Science",
          graduation_year: apiData.graduation_year || "2027",
          academic_level: apiData.academic_level || "Senior",
          industry: apiData.industry || "Technology",
          desired_career: apiData.desired_career || "Software Engineer",
          service_requested: apiData.service_requested || "Career Advice",
          comments: apiData.comments || ""
        });
      } catch (err) {
        setFormData(prev => ({
          ...prev,
          full_name: user?.full_name || user?.name || "Student User",
          email: user?.email || ""
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.full_name.trim()) {
      setError("Full Name cannot be left blank.");
      return;
    }

    try {
      await api.put("/student/profile/update", formData);
      setSuccessMessage("Profile updates saved successfully!");
      setIsEditMode(false);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  if (loading) return <div style={{ padding: "40px", color: "#666" }}>Loading account information...</div>;

  return (
    <div className="sp-container">
      <div className="sp-header-title">
        <h1>My Profile</h1>
        <p>View and manage your account information.</p>
      </div>

      {/* Meta Profile Identity Block */}
      <div className="sp-identity-card">
        <div className="sp-avatar-circle">
          <span>👤</span>
        </div>
        <div className="sp-identity-meta">
          <h2>{formData.full_name}</h2>
          <p className="sp-meta-email">{formData.email}</p>
          <span className="sp-badge-applicant">Applicant</span>
        </div>
        {isEditMode && <button type="button" className="sp-btn-photo">Change Photo</button>}
      </div>

      <form onSubmit={handleSave} className="sp-form">
        {/* SECTION 1: Personal Information */}
        <div className="sp-form-section">
          <h3>Personal Information</h3>
          <div className="sp-form-grid">
            <div className="sp-field">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditMode}
              />
            </div>
            <div className="sp-field">
              <label>Email Address</label>
              <div className="sp-input-locked">
                <input type="email" value={formData.email} disabled />
                <span className="sp-lock-icon">🔒</span>
              </div>
            </div>
            <div className="sp-field">
              <label>School</label>
              <input
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                disabled={!isEditMode}
              />
            </div>
            <div className="sp-field">
              <label>Major</label>
              <input
                type="text"
                name="major"
                value={formData.major}
                onChange={handleChange}
                disabled={!isEditMode}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="sp-field">
              <label>Graduation Year</label>
              {isEditMode ? (
                <select name="graduation_year" value={formData.graduation_year} onChange={handleChange}>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
              ) : (
                <input type="text" value={formData.graduation_year} disabled />
              )}
            </div>
            <div className="sp-field">
              <label>Academic Level</label>
              {isEditMode ? (
                <select name="academic_level" value={formData.academic_level} onChange={handleChange}>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                </select>
              ) : (
                <input type="text" value={formData.academic_level} disabled />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Career Information */}
        <div className="sp-form-section">
          <h3>Career Information</h3>
          <p className="sp-section-subtext">This information comes from your submitted Career Form. To request a different service or update your career goals, submit a new Career Form.</p>
          
          <div className="sp-form-grid">
            <div className="sp-field">
              <label>Industry</label>
              {isEditMode ? (
                <select name="industry" value={formData.industry} onChange={handleChange}>
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={formData.industry} disabled />
              )}
            </div>
            <div className="sp-field">
              <label>Desired Career</label>
              <input
                type="text"
                name="desired_career"
                value={formData.desired_career}
                onChange={handleChange}
                disabled={!isEditMode}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="sp-field full-width">
              <label>Comments/Goals</label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                disabled={!isEditMode}
                rows={3}
              />
            </div>
            <div className="sp-field">
              <label>Service Requested</label>
              {isEditMode ? (
                <select name="service_requested" value={formData.service_requested} onChange={handleChange}>
                  <option value="Career Advice">Career Advice</option>
                  <option value="Resume Review">Resume Review</option>
                  <option value="Mock Interview">Mock Interview</option>
                </select>
              ) : (
                <input type="text" value={formData.service_requested} disabled />
              )}
            </div>
            <div className="sp-field sp-view-form-container">
              <div className="sp-action-box">
                <span className="sp-action-icon">📄</span>
                <span className="sp-action-text">Submitted Career Form</span>
                <button
                  type="button"
                  className="sp-btn-view-form"
                  disabled
                  title="Viewing your submitted Career Form isn't available yet"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && <p className="sp-error-banner">{error}</p>}
        {successMessage && <p className="sp-success-banner">{successMessage}</p>}

        {/* Footer Actions Row */}
        <div className="sp-form-actions">
          {isEditMode ? (
            <>
              <button type="button" className="sp-btn-cancel" onClick={() => setIsEditMode(false)}>Cancel</button>
              <button type="submit" className="sp-btn-save">Save Changes</button>
            </>
          ) : (
            <button type="button" className="sp-btn-edit" onClick={() => setIsEditMode(true)}>Edit Profile</button>
          )}
        </div>
      </form>
    </div>
  );
}