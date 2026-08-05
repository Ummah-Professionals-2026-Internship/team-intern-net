// Shared mentor normalization + status logic.
// Capacity tab is the source of truth: both FullMentorsPanel and
// FullCapacityPanel must import normalizeMentor/getStatus from here
// instead of keeping their own local copies, so the two tabs can never
// disagree on status, email, industry, etc.

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export function normalizeMentor(m) {
  const capacity = m.capacity ?? m.max_capacity ?? m.max_monthly_sessions ?? 3;
  const assignedCount = m.assigned_count ?? m.current_mentees_count ?? 0;
  const openSlots = Math.max(capacity - assignedCount, 0);

  const jobTitle = firstNonEmpty(
    m.job_title,
    m.title,
    m.role,
    m.profile?.job_title,
    m.profiles?.job_title,
    m.user?.job_title
  );

  let servicesOffered = [];
  const rawServices = firstNonEmpty(
    m.service_types,
    m.services_offered,
    m.services,
    m.service,
    m.mentorship_type
  );
  if (Array.isArray(rawServices)) {
    servicesOffered = rawServices.filter(Boolean);
  } else if (typeof rawServices === "string") {
    try {
      const parsed = JSON.parse(rawServices);
      servicesOffered = Array.isArray(parsed) ? parsed.filter(Boolean) : [rawServices];
    } catch {
      servicesOffered = rawServices.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const mentorUserId = m.mentor_user_id || m.user_id || m.id;

  return {
    id: mentorUserId || m.email,
    user_id: mentorUserId,
    mentor_user_id: mentorUserId,
    raw: m,
    name: m.full_name || m.name || m.user?.full_name || "Unknown Mentor",
    email: firstNonEmpty(m.email, m.user?.email, m.profile?.email, m.profiles?.email) || "N/A",
    industry: firstNonEmpty(m.industry, m.field, m.career_field, m.company, m.user?.industry) || "N/A",
    jobTitle: jobTitle || "N/A",
    servicesOffered, // [] when none — render as an "N/A" pill in the UI
    assignedCount,
    capacity,
    openSlots,
  };
}

// Single canonical status rule. A mentor is only "Cooldown"/"At Capacity"
// when the backend explicitly flags at_capacity — we don't infer it from
// openSlots === 0, since that produced a different answer than the
// Capacity tab for the same mentor.
export function getStatus(m) {
  if (m.raw.at_capacity) {
    return {
      key: "cooldown",
      label: m.raw.cooldown_until
        ? `Cooldown (until ${new Date(m.raw.cooldown_until).toLocaleDateString()})`
        : "At Capacity",
      className: "status-pill cooldown",
    };
  }
  if (m.raw.has_active_assignment || m.assignedCount > 0) {
    return { key: "booked", label: "Booked", className: "status-pill booked" };
  }
  return { key: "available", label: "Available", className: "status-pill available" };
}