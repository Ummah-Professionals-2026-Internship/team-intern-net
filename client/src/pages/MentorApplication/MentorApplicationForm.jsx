import "./MentorApplicationForm.css";
import bgImage from "../../assets/images/mentor-app-bg.png";
import umIcon from "../../assets/images/um-small-logo.png";

import { useState } from "react";

const VOLUNTEERING_OPTIONS = [
  { label: "Healthcare Service", value: "healthcare_service" },
  { label: "Mentorship Program", value: "mentorship_program" },
  { label: "General Career Advice", value: "career_advice" },
  { label: "Mock Interview", value: "mock_interview" },
  { label: "Resume Review", value: "resume_review" },
];

const INDUSTRY_OPTIONS = [
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

const EXPERIENCE_LEVELS = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Executive (10+ years)",
];

export default function MentorApplicationForm() {
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    linkedIn: "",
    county: "",
    state: "",
    almaMater: "",
    major: "",
    employer: "",
    jobTitle: "",
    industry: "",
    experienceLevel: "",
    otherInfo: "",
    volunteeringFor: [],
  });


  const fieldMap = {
    full_name: "fullName",
    phone_number: "phoneNumber",
    email: "email",
    employer: "employer",
    job_title: "jobTitle",
    industry: "industry",
    experience: "experienceLevel",
    linkedin_url: "linkedIn",
    major: "major",
    alma_mater: "almaMater",
    county: "county",
    state: "state",
    other_info: "otherInfo",
    service_types: "volunteeringFor",
  };


  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleVolunteering = (value) => {
    setForm((prev) => {
      const already = prev.volunteeringFor.includes(value);
      return {
        ...prev,
        volunteeringFor: already
          ? prev.volunteeringFor.filter((o) => o !== value)
          : [...prev.volunteeringFor, value],
      };
    });
    if (errors.volunteeringFor) setErrors((prev) => ({ ...prev, volunteeringFor: "" }));
  };

  const validate = () => {
    const required = {
      fullName: "Full name is required",
      phoneNumber: "Phone number is required",
      email: "Email is required",
      employer: "Employer is required",
      jobTitle: "Job title is required",
      industry: "Please select an industry",
      experienceLevel: "Please select an experience level",
    };

    const next = {};
    Object.entries(required).forEach(([key, msg]) => {
      if (!form[key].trim()) next[key] = msg;
    });
    if (form.phoneNumber && !/^\+?[0-9\s()-]{7,20}$/.test(form.phoneNumber)) {
      next.phoneNumber = "Enter a valid phone number";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    if (form.linkedIn && !/^https?:\/\/.+\..+/.test(form.linkedIn)) {
      next.linkedIn = "Enter a valid URL (e.g. https://linkedin.com/in/yourname)";
    }
    if (form.volunteeringFor.length === 0) {
      next.volunteeringFor = "Select at least one service";
    }


    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    
    setLoading(true);
    setServerError("");

    try {
    const response = await fetch("http://localhost:8000/mentors/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.fullName,
        phone_number: form.phoneNumber,
        email: form.email,
        employer: form.employer,
        job_title: form.jobTitle,
        industry: form.industry,
        experience: form.experienceLevel,
        linkedin_url: form.linkedIn || null,
        major: form.major,
        alma_mater: form.almaMater,
        county: form.county,
        state: form.state,
        other_info: form.otherInfo,
        service_types: form.volunteeringFor,
      }),

    });
    const data = await response.json();
    if (!response.ok) {
      console.log("Backend error:", data);
      if (data.detail && Array.isArray(data.detail)) {
        // map FastAPI validation errors back to form fields
        const backendErrors = {};
        data.detail.forEach((err) => {
          const snakeField = err.loc[1];
          const camelField = fieldMap[snakeField] || snakeField;
          backendErrors[camelField] = err.msg;
        });
        setErrors(backendErrors);
      } else {
        // fallback for non-validation errors
        setServerError(data.detail || "Something went wrong. Please try again.");
      }
    } else {
      setSubmitted(true);
    }
  } catch (err) {
    setServerError("Network error. Please check your connection and try again.");
    console.log(err)
  } finally {
    setLoading(false);
  }
  
  };

  if (submitted) {
    return (
      <div className="caa-page">
        {/* <BackgroundPattern /> */}
        <div className="caa-bg-pattern" style={{ backgroundImage: `url(${bgImage})` }}/>
        <div className="caa-card caa-success-card">
          <div className="caa-success-icon">✓</div>
          <h2 className="caa-success-title">Application Submitted</h2>
          <p className="caa-success-body">
            Thank you for signing up, <strong>{form.fullName}</strong>. Your application
            will be reviewed by Ummah Professionals and login credentials will be emailed to <strong>{form.email}</strong>
            after approval.
          </p>
          <button
            className="caa-btn-submit"
            onClick={() => { setSubmitted(false); setForm({ fullName: "", phoneNumber: "", email: "", linkedIn: "", county: "", state: "", almaMater: "", major: "", employer: "", jobTitle: "", industry: "", experienceLevel: "", otherInfo: "", volunteeringFor: [] }); }}
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="caa-page">
      <div className="caa-bg-image" style={{ backgroundImage: `url(${bgImage})` }}/>

      <div className="caa-card">
        {/* Header */}
        <div className="caa-header">
          <div className="caa-logo" style={{ backgroundImage: `url(${umIcon})` }}/>
          <div className="caa-header-text">
            <h1 className="caa-title">Career Advisor Application</h1>
            <p className="caa-subtitle">Sign up to be a part of our network of volunteers</p>
          </div>
          <div className="caa-header-spacer"></div>
        </div>

        {/* Personal Information */}
        <section className="caa-section">
          <h2 className="caa-section-title">Personal Information</h2>
          <div className="caa-grid-2">
            <Field label="Full Name" required error={errors.fullName}>
              <input
                className={`caa-input ${errors.fullName ? "caa-input--error" : ""}`}
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </Field>

            <Field label="Phone Number" required error={errors.phoneNumber}>
              <input
                className={`caa-input ${errors.phoneNumber ? "caa-input--error" : ""}`}
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="(555) 000-0000"
              />
            </Field>

            <Field label="Email" required error={errors.email}>
              <input
                className={`caa-input ${errors.email ? "caa-input--error" : ""}`}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
              />
            </Field>

            <Field label="LinkedIn">
              <input
                className="caa-input"
                name="linkedIn"
                value={form.linkedIn}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourname"
              />
            </Field>

            <div className="caa-grid-inline">
              <Field label="County">
                <input
                  className="caa-input"
                  name="county"
                  value={form.county}
                  onChange={handleChange}
                  placeholder="Newark County"
                />
              </Field>
              <Field label="State">
                <input
                  className="caa-input"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="NJ"
                />
              </Field>
            </div>

            <Field label="Alma Mater">
              <input
                className="caa-input"
                name="almaMater"
                value={form.almaMater}
                onChange={handleChange}
                placeholder="List all universities for undergraduate and graduate studies"
              />
            </Field>
          </div>
        </section>

        {/* Major / Field of Study */}
        <section className="caa-section">
          <h2 className="caa-section-title">Major / Field of Study</h2>
          <Field label="Major">
            <input
              className="caa-input caa-input--full"
              name="major"
              value={form.major}
              onChange={handleChange}
              placeholder="Undergraduate and/or graduate majors"
            />
          </Field>
        </section>

        {/* Professional Background */}
        <section className="caa-section">
          <h2 className="caa-section-title">Professional Background</h2>
          <div className="caa-grid-2">
            <Field label="Employer" required error={errors.employer}>
              <input
                className={`caa-input ${errors.employer ? "caa-input--error" : ""}`}
                name="employer"
                value={form.employer}
                onChange={handleChange}
                placeholder="Company name"
              />
            </Field>

            <Field label="Job Title" required error={errors.jobTitle}>
              <input
                className={`caa-input ${errors.jobTitle ? "caa-input--error" : ""}`}
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
              />
            </Field>

            <Field label="Industry" required error={errors.industry}>
              <select
                className={`caa-select ${errors.industry ? "caa-input--error" : ""}`}
                name="industry"
                value={form.industry}
                onChange={handleChange}
              >
                <option value="">Which industry best aligns with your role?</option>
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>

            <Field label="Experience Level" required error={errors.experienceLevel}>
              <select
                className={`caa-select ${errors.experienceLevel ? "caa-input--error" : ""}`}
                name="experienceLevel"
                value={form.experienceLevel}
                onChange={handleChange}
              >
                <option value="">Select experience level</option>
                {EXPERIENCE_LEVELS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Bottom two-column: Volunteering + Other Info */}
        <section className="caa-section">
          <div className="caa-grid-2 caa-grid-2--top-align">
            {/* Volunteering */}
            <div>
              <h2 className="caa-section-title">
                Volunteering For <span className="caa-required">*</span>
              </h2>
              <p className="caa-hint">Which services would you like to participate in?</p>
              {errors.volunteeringFor && (
                <p className="caa-error-msg">{errors.volunteeringFor}</p>
              )}
              <div className="caa-tag-group">
                {VOLUNTEERING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`caa-tag ${form.volunteeringFor.includes(opt.value) ? "caa-tag--active" : ""}`}
                    onClick={() => toggleVolunteering(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Information */}
            <div>
              <h2 className="caa-section-title">Other Information</h2>
              <p className="caa-hint">Anything else you'd like to share with us?</p>
              <textarea
                className="caa-textarea"
                name="otherInfo"
                value={form.otherInfo}
                onChange={handleChange}
                rows={6}
                placeholder="Optional — share anything relevant to your application"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="caa-footer">
          {serverError && <p className="caa-error-msg">{serverError}</p>}
          <button className="caa-btn-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
          <p className="caa-footer-note">
            <span className="caa-footer-icon">ⓘ</span>
            Application will be reviewed by Ummah Professionals. Login credentials will be emailed after approval.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Reusable field wrapper */
function Field({ label, required, error, children }) {
  return (
    <div className="caa-field">
      <label className="caa-label">
        {label}
        {required && <span className="caa-required"> *</span>}
      </label>
      {children}
      {error && <p className="caa-error-msg">{error}</p>}
    </div>
  );
}
