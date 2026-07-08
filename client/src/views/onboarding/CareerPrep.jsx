import React, { useState } from "react";
import { FileText } from "lucide-react";

import FileUpload from "../../components/ui/FileUpload";
import featherAdd from "../../assets/images/feather-add.svg";
import infoIcon from "../../assets/images/info-icon.svg";
import umLogo from "../../assets/images/um-logo.png";
import userVoice from "../../assets/images/user-voice.svg";
import appBg from "../../assets/images/app-bg.png";
import uploadIcon from "../../assets/images/upload.svg";
import "./CareerPrep.css";

// 1. Updated enum values to match backend GenderEnum ('male', 'female')
const GENDER_OPTIONS = [
  { label: "Male", value: "m" },
  { label: "Female", value: "f" },
];

const SERVICES = [
  { value: "resume_review", label: "Resume Review" },
  { value: "mock_interview", label: "Mock Interview" },
  { value: "career_advice", label: "Career Advice" },
];

const ACADEMIC_LEVEL_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate Student",
  "Recent Graduate",
];

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

const REFERRAL_OPTIONS = [
  "Word of Mouth",
  "Instagram",
  "LinkedIn",
  "My MSA",
  "My YM",
  "Other",
];

const MAX_RESUME_SIZE_MB = 5;
const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  academicLevel: "",
  gender: "",
  major: "",
  industry: "",
  desiredCareer: "",
  serviceType: "",
  referralSource: "",
  comments: "",
};

export default function CareerPrep() {
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectService = (value) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
    if (errors.serviceType) setErrors((prev) => ({ ...prev, serviceType: "" }));
  };

  const handleResumeChange = (file) => {
    setResume(file);
    if (errors.resume) setErrors((prev) => ({ ...prev, resume: "" }));
  };

  const validate = () => {
    const required = {
      fullName: "Full name is required",
      phone: "Phone number is required",
      email: "Email is required",
      academicLevel: "Please select your academic level",
      major: "Major/Field of study is required",
      industry: "Please select an industry",
      desiredCareer: "Desired career is required",
      serviceType: "Please select a service",
      gender: "Please select a gender",
    };

    const next = {};
    Object.entries(required).forEach(([key, msg]) => {
      if (!form[key] || !form[key].trim()) next[key] = msg;
    });

    if (form.phone && !/^\+?[0-9\s()-]{7,20}$/.test(form.phone)) {
      next.phone = "Enter a valid phone number";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }

    if (resume) {
      if (!ALLOWED_RESUME_TYPES.includes(resume.type)) {
        next.resume = "Resume must be a PDF or Word document";
      } else if (resume.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
        next.resume = `Resume must be smaller than ${MAX_RESUME_SIZE_MB}MB`;
      }
    }

    return next;
  };

  // Helper function to map UI Academic Level to backend Enums
  const getEducationAndStanding = (level) => {
    switch (level) {
      case "Freshman":
        return { education_level: "undergraduate", academic_standing: "freshman" };
      case "Sophomore":
        return { education_level: "undergraduate", academic_standing: "sophomore" };
      case "Junior":
        return { education_level: "undergraduate", academic_standing: "junior" };
      case "Senior":
        return { education_level: "undergraduate", academic_standing: "senior" };
      case "Graduate Student":
        return { education_level: "graduate", academic_standing: null };
      case "Recent Graduate":
        return { education_level: "other", academic_standing: null };
      default:
        return { education_level: "other", academic_standing: null };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError("");

    const { education_level, academic_standing } = getEducationAndStanding(form.academicLevel);

    const formData = new FormData();
    formData.append("full_name", form.fullName.trim());
    formData.append("email", form.email.trim());
    formData.append("phone", form.phone.trim());
    formData.append("gender", form.gender);
    formData.append("education_level", education_level);
    if (academic_standing) formData.append("academic_standing", academic_standing);
    formData.append("major", form.major.trim());
    formData.append("service_type", form.serviceType);
    formData.append("desired_career", form.desiredCareer.trim());
    if (form.comments) formData.append("comments", form.comments.trim());
    if (form.referralSource) formData.append("referral_source", form.referralSource);
    if (form.industry) formData.append("industry", form.industry);
    if (resume) formData.append("resume", resume);

    try {
      const res = await fetch("http://localhost:8000/intake/apply", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // FIX HERE: Safely parse detail if it's a Pydantic validation array or object
        if (typeof data.detail === "string") {
          setServerError(data.detail);
        } else if (Array.isArray(data.detail)) {
          // Formats FastAPI validation errors into a clean human-readable string
          const errorMessages = data.detail
            .map((err) => `${err.loc?.[1] || "field"}: ${err.msg}`)
            .join(", ");
          setServerError(errorMessages);
        } else {
          setServerError("Failed to submit request. Please check your inputs.");
        }
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="career-prep-page">
        <div className="caa-bg-image" style={{ backgroundImage: `url(${appBg})` }} />
        <div className="career-prep-card career-prep-success">
          <h2>Request Submitted</h2>
          <p>
            Thank you for applying to Career Prep, <strong>{form.fullName}</strong>. Your login
            credentials will be emailed to <strong>{form.email}</strong> upon completion of your application.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={() => {
              setSubmitted(false);
              setForm(initialForm);
              setResume(null);
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="career-prep-page">
      <div className="caa-bg-image" style={{ backgroundImage: `url(${appBg})` }} />

      <div className="career-prep-card">
        <img src={umLogo} alt="Ummah Professionals" className="career-prep-logo" />
        <h1 className="career-prep-title">Career Prep Form</h1>
        <p className="career-prep-subtitle">sign up to connect with our experienced professionals</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Personal Information */}
          <section className="form-section">
            <h2 className="section-title">Personal Information <span className="required-mark">*</span></h2>
            <div className="form-grid">
              <Field label="Full Name:" error={errors.fullName}>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Email Address:" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Phone Number:" error={errors.phone}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Academic Level:" error={errors.academicLevel}>
                <select
                  name="academicLevel"
                  value={form.academicLevel}
                  onChange={handleChange}
                >
                  <option value=""></option>
                  {ACADEMIC_LEVEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Career Information */}
          <section className="form-section">
            <h2 className="section-title">Career Information <span className="required-mark">*</span></h2>
            <div className="form-grid form-grid--three">
              <Field label="Major/Field of Study:" error={errors.major}>
                <input
                  id="major"
                  name="major"
                  type="text"
                  value={form.major}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Industry:" error={errors.industry}>
                <select name="industry" value={form.industry} onChange={handleChange}>
                  <option value=""></option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Desired Career:" error={errors.desiredCareer}>
                <input
                  id="desiredCareer"
                  name="desiredCareer"
                  type="text"
                  value={form.desiredCareer}
                  onChange={handleChange}
                />
              </Field>
            </div>
          </section>

          {/* Service Requested */}
          <section className="form-section">
            <h2 className="section-title">
              Service Requested <span className="required-mark">*</span>
            </h2>
            <div className="service-options">
              {SERVICES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`service-card ${
                    form.serviceType === value ? "service-card--selected" : ""
                  }`}
                  onClick={() => handleSelectService(value)}
                >
                  {value === "resume_review" && (
                    <FileText size={26} strokeWidth={1.8} className="service-icon" />
                  )}
                  {value === "mock_interview" && (
                    <img src={userVoice} alt="" className="service-icon" />
                  )}
                  {value === "career_advice" && (
                    <img src={featherAdd} alt="" className="service-icon" />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {errors.serviceType && <p className="field-error">{errors.serviceType}</p>}
          </section>

          {/* Gender */}
          <section className="form-section">
            <h2 className="section-title">Gender <span className="required-mark">*</span></h2>
            <div className="gender-options">
              {GENDER_OPTIONS.map(({ label, value }) => (
                <label key={value} className="radio-option">
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={form.gender === value}
                    onChange={handleChange}
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.gender && <p className="field-error">{errors.gender}</p>}
          </section>

          {/* Resume Upload / Comments / Referral */}
          <section className="form-section form-grid">
            <div className="upload-and-referral-col">
              <div className="form-field">
                <h2 className="section-title section-title--field">Resume Upload</h2>
                <FileUpload
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  value={resume}
                  onChange={handleResumeChange}
                  placeholder="Upload Resume"
                  icon={uploadIcon} 
                />
                {errors.resume && <p className="field-error">{errors.resume}</p>}
              </div>

              <div className="form-field form-field--referral">
                <h2 className="section-title section-title--field">How did you hear about us?</h2>
                <select
                  id="referralSource"
                  name="referralSource"
                  value={form.referralSource}
                  onChange={handleChange}
                >
                  <option value=""></option>
                  {REFERRAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <h2 className="section-title section-title--field">Comments/Goals</h2>
              <textarea
                id="comments"
                name="comments"
                value={form.comments}
                onChange={handleChange}
              />
            </div>
          </section>

          {serverError && <p className="submit-error">{serverError}</p>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "submitting..." : "submit"}
          </button>

          <p className="credentials-note">
            <img src={infoIcon} alt="" className="info-icon" />
            login credentials will be emailed upon completion of application
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}