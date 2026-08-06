import { useState } from "react";
import { FileText } from "lucide-react";

import FileUpload from "../../components/ui/FileUpload";
import featherAdd from "../../assets/images/feather-add.svg";
import infoIcon from "../../assets/images/info-icon.svg";
import umLogo from "../../assets/images/um-logo.png";
import userVoice from "../../assets/images/user-voice.svg";
import appBg from "../../assets/horizontal-swirl.svg";
import uploadIcon from "../../assets/images/upload.svg";
import "./CareerPrep.css";
import api from '../../api/api';


// --- FORM SELECT OPTIONS & CONSTANTS ---
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
  "Other",
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

// Resume File Upload Restrictions
const MAX_RESUME_SIZE_MB = 5;
const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Initial form state model
const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  academicLevel: "",
  otherAcademicLevel: "",
  gender: "",
  major: "",
  industry: "",
  otherIndustry: "",
  desiredCareer: "",
  serviceType: "",
  referralSource: "",
  comments: "",
};

/**
 * CareerPrep Component
 * Handles candidate intake applications, client-side validation, 
 * resume uploads, and backend POST requests to /intake/apply.
 */
export default function CareerPrep() {
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  /** Updates form fields in state and clears field-level errors on edit */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /** Handles selection of service type card options */
  const handleSelectService = (value) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
    if (errors.serviceType) setErrors((prev) => ({ ...prev, serviceType: "" }));
  };

  /** Handles resume file attachment from FileUpload component */
  const handleResumeChange = (file) => {
    setResume(file);
    if (errors.resume) setErrors((prev) => ({ ...prev, resume: "" }));
  };

  /** Resets form, file, and error states when user submits another request */
  const resetFormState = () => {
    setForm(initialForm);
    setResume(null);
    setErrors({});
    setServerError("");
    setSubmitted(false);
  };

  /**
   * Client-side Form Validation
   * @returns {Object} Object containing error messages keyed by input name
   */
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

    // Check presence of required string fields
    Object.entries(required).forEach(([key, msg]) => {
      if (!form[key] || !form[key].trim()) next[key] = msg;
    });

    // Validate 'Other' custom text input if 'Other' academic level is selected
    if (form.academicLevel === "Other" && !form.otherAcademicLevel.trim()) {
      next.academicLevel = "Please specify your academic level";
    }

    // Validate 'Other' custom text input if 'Other' industry is selected
    if (form.industry === "Other" && !form.otherIndustry.trim()) {
      next.industry = "Please specify your industry";
    }

    // Phone format regex
    if (form.phone && !/^\+?[0-9\s()-]{7,20}$/.test(form.phone)) {
      next.phone = "Enter a valid phone number";
    }

    // Email format regex
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }

    // Resume file type and size checks
    if (resume) {
      if (!ALLOWED_RESUME_TYPES.includes(resume.type)) {
        next.resume = "Resume must be a PDF or Word document";
      } else if (resume.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
        next.resume = `Resume must be smaller than ${MAX_RESUME_SIZE_MB}MB`;
      }
    }

    return next;
  };

  /**
   * Maps UI Academic Level string selection to backend Database Enums
   * @param {string} level - Selected academic level option
   * @returns {{ education_level: string, academic_standing: string|null }}
   */
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
      case "Other":
      default:
        return { education_level: "undergraduate", academic_standing: null };
    }
  };

  /** Form submit handler sending multipart/form-data payload */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Run client-side validation
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError("");

    // 2. Map UI level selections to DB enums
    const { education_level, academic_standing } = getEducationAndStanding(form.academicLevel);

    // 3. Resolve actual industry string (use specified text if "Other")
    const finalIndustry =
      form.industry === "Other" ? form.otherIndustry.trim() : form.industry;

    // 4. Construct FormData payload for multipart submission
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
    if (form.comments.trim()) formData.append("comments", form.comments.trim());
    if (form.referralSource) formData.append("referral_source", form.referralSource);
    if (finalIndustry) formData.append("industry", finalIndustry);
    if (resume) formData.append("resume", resume);

    try {
      await api.post("/intake/apply", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitted(true);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data?.detail === "string") {
        setServerError(data.detail);
      } else if (Array.isArray(data?.detail)) {
        const errorMessages = data.detail
          .map((err) => `${err.loc?.[1] || "field"}: ${err.msg}`)
          .join(", ");
        setServerError(errorMessages);
      } else {
        setServerError("Failed to submit request. Please check your inputs.");
      }
    } finally {
      setLoading(false);
    }
  };



  // --- RENDER SUCCESS VIEW ---
  if (submitted) {
    return (
      <div className="career-prep-page">
        <div className="caa-bg-image" style={{ backgroundImage: `url(${appBg})` }} />
        <div className="career-prep-card career-prep-success">
          <div className="career-prep-success-icon">✓</div>
          <h2 className="career-prep-success-title">Request Submitted</h2>
          <p className="career-prep-success-body">
            Thank you for applying to Career Prep, <strong>{form.fullName}</strong>. Your login
            credentials will be emailed to <strong>{form.email}</strong> upon completion of your application.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={resetFormState}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER FORM VIEW ---
  return (
    <div className="career-prep-page">
      <div className="caa-bg-image" style={{ backgroundImage: `url(${appBg})` }} />

      <div className="career-prep-card">
        <img src={umLogo} alt="Ummah Professionals" className="career-prep-logo" />
        <h1 className="career-prep-title">Career Prep Form</h1>
        <p className="career-prep-subtitle">sign up to connect with our experienced professionals</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* SECTION: Personal Information */}
          <section className="form-section">
            <h2 className="section-title">Personal Information <span className="required-mark">*</span></h2>
            <div className="form-grid">
              <Field id="fullName" label="Full Name:" error={errors.fullName}>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                />
              </Field>

              <Field id="email" label="Email Address:" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                />
              </Field>

              <Field id="phone" label="Phone Number:" error={errors.phone}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                />
              </Field>

              <Field id="academicLevel" label="Academic Level:" error={errors.academicLevel}>
                <select
                  id="academicLevel"
                  name="academicLevel"
                  value={form.academicLevel}
                  onChange={handleChange}
                >
                  <option value="">Select academic level...</option>
                  {ACADEMIC_LEVEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>

                {/* Conditional input when 'Other' academic level is selected */}
                {form.academicLevel === "Other" && (
                  <input
                    type="text"
                    name="otherAcademicLevel"
                    value={form.otherAcademicLevel}
                    onChange={handleChange}
                    placeholder="Please specify (e.g. Bootcamp, High School, Self-Taught)"
                    style={{ marginTop: "8px" }}
                  />
                )}
              </Field>
            </div>
          </section>

          {/* SECTION: Career Information */}
          <section className="form-section">
            <h2 className="section-title">Career Information <span className="required-mark">*</span></h2>
            <div className="form-grid form-grid--three">
              <Field id="major" label="Major/Field of Study:" error={errors.major}>
                <input
                  id="major"
                  name="major"
                  type="text"
                  value={form.major}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                />
              </Field>

              <Field id="industry" label="Industry:" error={errors.industry}>
                <select id="industry" name="industry" value={form.industry} onChange={handleChange}>
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>

                {/* Conditional input when 'Other' industry is selected */}
                {form.industry === "Other" && (
                  <input
                    type="text"
                    name="otherIndustry"
                    value={form.otherIndustry}
                    onChange={handleChange}
                    placeholder="Please specify (e.g. Aviation, Media, Real Estate)"
                    style={{ marginTop: "8px" }}
                  />
                )}
              </Field>

              <Field id="desiredCareer" label="Desired Career:" error={errors.desiredCareer}>
                <input
                  id="desiredCareer"
                  name="desiredCareer"
                  type="text"
                  value={form.desiredCareer}
                  onChange={handleChange}
                  placeholder="e.g. Software Engineer"
                />
              </Field>
            </div>
          </section>

          {/* SECTION: Service Requested */}
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

          {/* SECTION: Gender */}
          <section className="form-section">
            <h2 className="section-title">Gender <span className="required-mark">*</span></h2>
            <div className="form-field">
              <select 
                id="gender" 
                name="gender" 
                value={form.gender} 
                onChange={handleChange}
              >
                <option value="">Select gender...</option>
                {GENDER_OPTIONS.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {errors.gender && <p className="field-error">{errors.gender}</p>}
          </section>

          {/* SECTION: Resume Upload, Referral Source, and Comments */}
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
                  <option value="">Select source...</option>
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
                placeholder="Tell us about your career goals, specific topics you'd like to cover, or any questions you have..."
              />
            </div>
          </section>

          {/* Global Server Error Rendering */}
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

/**
 * Reusable Form Field Wrapper
 * Renders associated labels, form elements, and field validation errors.
 */
function Field({ id, label, error, children }) {
  return (
    <div className="form-field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}