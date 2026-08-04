import { useEffect, useState } from "react";
import api from "../../api/api";

import Sidebar from "../../components/admin/Sidebar";
import FullMentorsPanel from "../../components/admin/FullMentorsPanel";
import FullCapacityPanel from "../../components/admin/FullCapacityPanel";
import FullApplicantPanel from "../../components/admin/FullApplicantPanel";
import FullMentorMatchPanel from "../../components/admin/FullMentorMatchPanel";
import MeetingsPanel from "../../components/admin/MeetingsPanel";
import MentorProfile from "../../components/admin/MentorProfile";
import MentorApplicationsPanel from "../../components/admin/MentorApplicationsPanel";
import AssignmentsPanel from "../../components/admin/AssignmentsPanel";

import StatCard from "../../components/ui/StatCard";
import Icon from "../../components/ui/Icon";

import bgDoubleSwirl from "../../assets/images/double-white-swirl.png";
import "./AdminDash.css";

export default function AdminDash() {
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const [selectedMentor, setSelectedMentor] = useState(null);
  const [viewedProfileMentor, setViewedProfileMentor] = useState(null);

  const [capacity, setCapacity] = useState([]);
  const [loadingCapacity, setLoadingCapacity] = useState(true);

  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);

  const [mentorApplications, setMentorApplications] = useState([]);
  const [loadingMentorApplications, setLoadingMentorApplications] = useState(true);

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  const fetchApplicants = async () => {
    try {
      const res = await api.get("/intake");
      const payload = res?.data ?? res;
      const dataArray = payload?.intake_forms || payload?.applicants || payload;
      setApplicants(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      console.error("Failed to load applicants:", err);
      setApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const fetchMentorsAndCapacity = async () => {
    try {
      const [mentorsRes, capacityRes] = await Promise.all([
        api.get("/mentors").catch(() => ({ data: [] })),
        api.get("/mentor-assignments/capacity").catch(() => ({ data: [] })),
      ]);

      const rawMentors = Array.isArray(mentorsRes.data) ? mentorsRes.data : [];
      const rawCapacity = Array.isArray(capacityRes.data) ? capacityRes.data : [];

      const capMap = new Map();
      rawCapacity.forEach((c) => {
        const key = c.mentor_user_id || c.id;
        if (key) capMap.set(key, c);
      });

      const enrichedMentors = rawMentors.map((m) => {
        const cap = capMap.get(m.user_id || m.id) || {};
        return {
          ...m,
          capacity: cap.capacity ?? m.max_monthly_sessions ?? 3,
          assigned_count: cap.assigned_count ?? 0,
          at_capacity: cap.at_capacity ?? false,
          cooldown_until: cap.cooldown_until ?? null,
          has_active_assignment: cap.has_active_assignment ?? false,
        };
      });

      const mentorMap = new Map();
      rawMentors.forEach((m) => {
        const key = m.user_id || m.id;
        if (key) mentorMap.set(key, m);
      });

      const enrichedCapacity = rawCapacity.map((c) => {
        const m = mentorMap.get(c.mentor_user_id || c.id) || {};
        return {
          ...c,
          ...m,
          full_name: m.user?.full_name || m.full_name || c.full_name || "Unknown Mentor",
          email: m.user?.email || m.email || "N/A",
          industry: m.industry || c.industry || "General",
          job_title: m.job_title || m.title || c.job_title || "N/A",
          employer: m.employer || m.company || c.employer || "",
          gender: m.gender || m.user?.gender || c.gender || null,
          service_types: (m.service_types && m.service_types.length > 0) ? m.service_types : (c.service_types || []),
          bio: m.bio || c.bio || "",
          capacity: c.capacity ?? m.max_monthly_sessions ?? 3,
          assigned_count: c.assigned_count ?? 0,
          at_capacity: c.at_capacity ?? false,
          cooldown_until: c.cooldown_until ?? null,
          has_active_assignment: c.has_active_assignment ?? false,
        };
      });

      setMentors(enrichedMentors.length > 0 ? enrichedMentors : enrichedCapacity);
      setCapacity(enrichedCapacity.length > 0 ? enrichedCapacity : enrichedMentors);
    } finally {
      setLoadingMentors(false);
      setLoadingCapacity(false);
    }
  };

  const fetchMentorApplications = async () => {
    try {
      const res = await api.get("/mentor/applications");
      setMentorApplications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load mentor applications:", err);
      setMentorApplications([]);
    } finally {
      setLoadingMentorApplications(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/mentor-assignments");
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load assignments:", err);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await api.get("/meetings");
      setMeetings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    fetchMentorsAndCapacity();
    fetchApplicants();
    fetchMentorApplications();
    fetchAssignments();
    fetchMeetings();
  }, []);

  const handleUpdateStatus = async (intakeId, newStatus) => {
    try {
      const res = await api.patch(`/intake/${intakeId}/status`, { status: newStatus });
      const updated = res.data;
      setApplicants((prev) =>
        prev.map((item) => (item.id === intakeId ? { ...item, ...updated } : item))
      );
      if (selectedApplicant && selectedApplicant.id === intakeId) {
        setSelectedApplicant((prev) => ({ ...prev, ...updated }));
      }
      return updated;
    } catch (err) {
      console.error("Failed to update applicant status:", err);
      throw err;
    }
  };

  const handleAssignMentor = async (applicant, mentor) => {
    if (!applicant) {
      alert("No applicant selected.");
      return;
    }
    const intakeId = applicant.id;
    const rawMentorId =
      mentor?.user_id ??
      mentor?.mentor_user_id ??
      mentor?.id ??
      mentor?.raw?.user_id ??
      mentor?.raw?.mentor_user_id ??
      mentor?.raw?.id;
    const mentorId = Number(rawMentorId);
    const studentId = applicant.student_id || applicant.student?.user_id || applicant.student_user_id;

    if (!intakeId || !mentorId || isNaN(mentorId)) {
      console.error("Missing valid IDs for assignment:", { intakeId, mentorId, rawMentorId, studentId, applicant, mentor });
      alert("Cannot complete assignment: Invalid student or mentor identification.");
      return;
    }

    try {
      const payload = {
        intake_form_id: intakeId,
        mentor_id: mentorId,
      };
      if (studentId) {
        payload.student_id = studentId;
      }

      await api.post("/mentor-assignments", payload);

      alert(`Successfully assigned mentor to ${applicant.full_name || "student"}!`);
      await fetchApplicants();
      await fetchMentorsAndCapacity();
      await fetchAssignments();
      setActiveTab("assignments");
    } catch (err) {
      console.error("Failed to assign mentor:", err);
      alert(err.response?.data?.detail || "Failed to assign mentor. Please try again.");
    }
  };

  const handleDeleteApplicant = async (applicantToDelete) => {
    const applicantId = applicantToDelete.id;
    if (!applicantId) return;

    try {
      await api.delete(`/intake/${applicantId}`);
      setApplicants((prev) => prev.filter((item) => item.id !== applicantId));
      if (selectedApplicant && selectedApplicant.id === applicantId) {
        setSelectedApplicant(null);
      }
    } catch (err) {
      console.error("Failed to delete applicant:", err);
      alert("Failed to delete applicant. Please try again.");
    }
  };

  const pendingApplicantsCount = applicants.filter(
    (app) => !app.status || app.status === "submitted"
  ).length;

  return (
    <div className="admin-dash">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedApplicant={setSelectedApplicant}
        setSelectedMentor={setSelectedMentor}
      />

      <main className="admin-main">
        <img src={bgDoubleSwirl} className="main-bg-swirl" alt="" />

        {/* 1. MENTORS VIEW */}
        {activeTab === "mentors" ? (
          <FullMentorsPanel
            title="All Mentors"
            loading={loadingMentors}
            data={mentors.length ? mentors : capacity}
            selectedMentor={selectedMentor}
            onViewMentor={(m) => {
              setSelectedMentor(m);
              setActiveTab("mentors");
            }}
            onBackToList={() => setSelectedMentor(null)}
          />
        ) : /* 2. CAPACITY VIEW */
        activeTab === "capacity" ? (
          <FullCapacityPanel
            title="Mentor Capacity Tracking"
            loading={loadingCapacity}
            data={capacity}
            selectedMentor={selectedMentor}
            onViewMentor={(m) => {
              setSelectedMentor(m);
              setActiveTab("capacity");
            }}
            onBackToList={() => setSelectedMentor(null)}
          />
        ) : /* 3. MENTOR APPLICATIONS VIEW */
        activeTab === "applications" ? (
          <MentorApplicationsPanel
            loading={loadingMentorApplications}
            applications={mentorApplications}
            onRefresh={() => {
              fetchMentorApplications();
              fetchMentorsAndCapacity();
            }}
          />
        ) : /* 4. ASSIGNMENTS VIEW */
        activeTab === "assignments" ? (
          <AssignmentsPanel
            loading={loadingAssignments}
            assignments={assignments}
            onRefresh={() => {
              fetchAssignments();
              fetchApplicants();
              fetchMentorsAndCapacity();
            }}
            onReassign={(intakeForm) => {
              const targetId = intakeForm.id || intakeForm.intake_form_id;
              const fullIntake = applicants.find((a) => a.id === targetId) || {
                ...intakeForm,
                id: targetId,
                student_id: intakeForm.student_id,
              };
              setSelectedApplicant(fullIntake);
              setActiveTab("match");
            }}
          />
        ) : /* 5. MENTOR MATCHING VIEW */
        activeTab === "match" ? (
          viewedProfileMentor ? (
            <MentorProfile
              mentor={viewedProfileMentor}
              onBack={() => setViewedProfileMentor(null)}
              onAssignMentor={(mentor) => handleAssignMentor(selectedApplicant, mentor)}
            />
          ) : (
            <FullMentorMatchPanel
              applicant={selectedApplicant}
              applicants={applicants}
              mentors={mentors.length ? mentors : capacity}
              loading={loadingMentors}
              onBack={() => setActiveTab("applicants")}
              onBrowseAllMentors={() => setActiveTab("mentors")}
              onAssignMentor={handleAssignMentor}
              onViewMentor={setViewedProfileMentor}
              onSelectApplicant={setSelectedApplicant}
            />
          )
        ) : /* 6. APPLICANTS VIEW */
        activeTab === "applicants" ? (
          <FullApplicantPanel
            title="All Student Applicants"
            loading={loadingApplicants}
            data={applicants}
            selectedApplicant={selectedApplicant}
            onViewApplicant={(app) => {
              setSelectedApplicant(app);
              setActiveTab("applicants");
            }}
            onBackToList={() => setSelectedApplicant(null)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteApplicant={handleDeleteApplicant}
            onFindMatches={(app) => {
              setSelectedApplicant(app);
              setActiveTab("match");
            }}
          />
        ) : activeTab === "meetings" ? (
          <MeetingsPanel
            title="Mentorship Meetings & Assignments"
            loading={loadingMeetings || loadingAssignments}
            data={meetings}
            assignments={assignments}
            onRefresh={() => {
              fetchMeetings();
              fetchAssignments();
              fetchApplicants();
              fetchMentorsAndCapacity();
            }}
            onReassign={(intakeForm) => {
              const targetId = intakeForm.id || intakeForm.intake_form_id;
              const fullIntake = applicants.find((a) => a.id === targetId) || {
                ...intakeForm,
                id: targetId,
                student_id: intakeForm.student_id,
              };
              setSelectedApplicant(fullIntake);
              setActiveTab("match");
            }}
          />
        ) : (
          /* 7. DASHBOARD VIEW (Default / "home") */
          <>
            <h1 className="admin-title">Welcome Back, Admin</h1>

            <div className="stat-cards">
              <StatCard
                iconKey="applicants"
                variant="blue"
                value={loadingApplicants ? "--" : applicants.length}
                label="Total Applicants"
                linkText="View All Applicants"
                onClick={() => setActiveTab("applicants")}
              />
              <StatCard
                iconKey="mentors"
                variant="teal"
                value={loadingMentors && loadingCapacity ? "--" : mentors.length || capacity.length}
                label="Total Mentors"
                linkText="View All Mentors"
                onClick={() => setActiveTab("mentors")}
              />
              <StatCard
                iconKey="match"
                variant="purple"
                value={loadingApplicants ? "--" : pendingApplicantsCount}
                label="Matches Pending"
                linkText="View Pending Matches"
                onClick={() => setActiveTab("applicants")}
              />
              <StatCard
                iconKey="meetings"
                variant="yellow"
                value={loadingMentorApplications ? "--" : mentorApplications.length}
                label="Advisor Signups Pending"
                linkText="Review Advisor Signups"
                onClick={() => setActiveTab("applications")}
              />
            </div>

            <div className="panel-grid">
              {/* Panel 1: Recent Applicants */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="applicants" className="panel-icon icon-blue" />
                  <h2>Recent Applicants</h2>
                </div>
                {loadingApplicants ? (
                  <p className="muted">Loading applicants...</p>
                ) : applicants.length === 0 ? (
                  <p className="muted">No recent applicants found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Major</th>
                        <th>Desired Career</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.slice(0, 4).map((app, index) => {
                        const itemKey = app.id || app.student_id || `recent-app-${index}`;
                        return (
                          <tr key={itemKey}>
                            <td>{app.full_name || `${app.first_name || ""} ${app.last_name || ""}`.trim() || "N/A"}</td>
                            <td>{app.major || "N/A"}</td>
                            <td>{app.desired_career || app.career_goal || "N/A"}</td>
                            <td>
                              <button
                                type="button"
                                className="pill-btn"
                                onClick={() => {
                                  setSelectedApplicant(app);
                                  setActiveTab("applicants");
                                }}
                              >
                                View Applicant
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  className="view-all-link-btn"
                  onClick={() => setActiveTab("applicants")}
                >
                  View All Applicants
                </button>
              </section>

              {/* Panel 2: Mentor Capacity Tracking */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="capacity" className="panel-icon icon-pink" />
                  <h2>Mentor Capacity Tracking</h2>
                </div>
                {loadingCapacity ? (
                  <p className="muted">Loading mentors...</p>
                ) : capacity.length === 0 ? (
                  <p className="muted">No mentors found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Mentor</th>
                        <th>Capacity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacity.slice(0, 4).map((m, index) => {
                        const itemKey = m.mentor_user_id || m.id || `recent-cap-${index}`;
                        return (
                          <tr key={itemKey}>
                            <td>{m.full_name || `${m.first_name || ""} ${m.last_name || ""}`}</td>
                            <td>{m.assigned_count ?? 0}/{m.capacity ?? 0}</td>
                            <td>
                              <span className={`status-pill ${m.at_capacity ? "cooldown" : m.has_active_assignment ? "booked" : "available"}`}>
                                {m.at_capacity ? "Cooldown" : m.has_active_assignment ? "Booked" : "Available"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  className="view-all-link-btn"
                  onClick={() => setActiveTab("capacity")}
                >
                  View All Capacity
                </button>
              </section>

              {/* Panel 3: Pending Matches */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="match" className="panel-icon icon-purple" />
                  <h2>Pending Matches</h2>
                </div>
                {loadingApplicants ? (
                  <p className="muted">Loading...</p>
                ) : applicants.filter((a) => !a.status || a.status === "submitted").length === 0 ? (
                  <p className="muted">No unmatched applicants.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Desired Career</th>
                        <th>Match Score</th>
                        <th>Match Mentor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants
                        .filter((a) => !a.status || a.status === "submitted")
                        .slice(0, 4)
                        .map((app, index) => {
                          // Best match score across available mentors – mirrors FullMentorMatchPanel.scoreMentor
                          const clean = (s) => (s ? String(s).toLowerCase().replace(/_/g, " ").trim() : "");
                          const appService = clean(app.service_requested || app.service || app.service_type);
                          const appCareer = clean(app.desired_career || app.career || app.career_goal);
                          const appIndustry = clean(app.industry);
                          const appMajor = clean(app.major);
                          const appGender = clean(app.gender || app.user?.gender);

                          const bestScore = mentors.length
                            ? Math.max(
                                ...mentors.map((m) => {
                                  let s = 40;
                                  const mIndustry = clean(m.industry);
                                  const mJob = clean(m.job_title || m.jobTitle);
                                  const mMajor = clean(m.major);
                                  const mGender = clean(m.gender);
                                  const mServices = (m.service_types || m.services_offered || m.services || []).map(clean);

                                  if (appIndustry && mIndustry && (appIndustry.includes(mIndustry) || mIndustry.includes(appIndustry))) s += 25;
                                  if (appCareer && mJob && (mJob.includes(appCareer) || appCareer.includes(mJob))) s += 20;
                                  if (appService && mServices.some((sv) => sv && (sv === appService || sv.includes(appService) || appService.includes(sv)))) s += 25;
                                  if (appMajor && mMajor && appMajor === mMajor) s += 15;
                                  if (appGender && mGender && appGender === mGender) s += 10;

                                  // Tag overlap bonus
                                  const appTags = new Set([...(app.tags || []), appService, appCareer, appIndustry, appMajor].filter(Boolean).map(clean));
                                  const mTags = new Set([...(m.tags || []), ...mServices, mIndustry, mJob, mMajor].filter(Boolean).map(clean));
                                  let matches = 0;
                                  appTags.forEach((t) => { if (t && mTags.has(t)) matches++; });
                                  s += Math.min(20, matches * 5);

                                  if ((m.assigned_count ?? 0) < (m.capacity ?? m.max_monthly_sessions ?? 2)) s += 5;
                                  return Math.min(99, s);
                                })
                              )
                            : null;
                          return (
                            <tr key={app.id || `pm-${index}`}>
                              <td>{app.full_name || "N/A"}</td>
                              <td>{app.desired_career || app.career_goal || "N/A"}</td>
                              <td>
                                {bestScore !== null ? (
                                  <span className="match-score-badge">{bestScore}%</span>
                                ) : "--"}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="pill-btn"
                                  onClick={() => {
                                    setSelectedApplicant(app);
                                    setActiveTab("match");
                                  }}
                                >
                                  Review Match
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  className="view-all-link-btn"
                  onClick={() => setActiveTab("applicants")}
                >
                  View All Pending Matches
                </button>
              </section>

              {/* Panel 4: Upcoming Meetings */}
              <section className="panel">
                <div className="panel-header">
                  <Icon name="meetings" className="panel-icon icon-yellow" />
                  <h2>Upcoming Meetings</h2>
                </div>
                {loadingMeetings ? (
                  <p className="muted">Loading meetings...</p>
                ) : meetings.length === 0 ? (
                  <p className="muted">No upcoming meetings scheduled.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Mentor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings
                        .filter((m) => {
                          const s = (m.status || "").toLowerCase();
                          return s === "scheduled" || s === "upcoming" || !s;
                        })
                        .slice(0, 4)
                        .map((m, index) => {
                          const studentUser = m.assignment?.student?.user || {};
                          const intakeForm = m.assignment?.intake_form || {};
                          const mentorUser = m.assignment?.mentor?.user || {};
                          const applicantName = studentUser.full_name || intakeForm.full_name || "N/A";
                          const mentorName = mentorUser.full_name || "N/A";
                          const d = m.start_datetime ? new Date(m.start_datetime) : null;
                          const dateStr = d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";
                          const timeStr = d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "N/A";
                          return (
                            <tr key={m.id || `mtg-${index}`}>
                              <td>{applicantName}</td>
                              <td>{mentorName}</td>
                              <td>{dateStr}</td>
                              <td>{timeStr}</td>
                              <td>
                                {m.meeting_url ? (
                                  <a href={m.meeting_url} target="_blank" rel="noreferrer" className="pill-btn" style={{ display: "inline-block", textDecoration: "none", fontSize: "12px" }}>
                                    Join
                                  </a>
                                ) : (
                                  <span className="muted" style={{ fontSize: "12px" }}>No URL</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  className="view-all-link-btn"
                  onClick={() => setActiveTab("meetings")}
                >
                  View All Meetings
                </button>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}