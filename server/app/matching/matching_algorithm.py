from typing import List, Dict


WEIGHTS = {
    "gender": 20,
    "major": 15,
    "career": 25,
    "service": 25,
    "skill": 10,
    "interest": 5
}


SKILLS = {
    "python",
    "machine learning",
    "deep learning",
    "sql",
    "data science",
    "software engineering"
}


def _clean_str(s: str | None) -> str:
    if not s:
        return ""
    return str(s).lower().replace("_", " ").strip()


def calculate_match_score(
    student: Dict,
    mentor: Dict
) -> int:
    score = 0

    student_gender = _clean_str(student.get("gender"))
    mentor_gender = _clean_str(mentor.get("gender"))
    student_major = _clean_str(student.get("major"))
    mentor_major = _clean_str(mentor.get("major"))
    student_career = _clean_str(student.get("desired_career") or student.get("career"))
    mentor_industry = _clean_str(mentor.get("industry"))
    mentor_job_title = _clean_str(mentor.get("job_title") or mentor.get("jobTitle") or mentor.get("role"))
    student_service = _clean_str(student.get("service_type") or student.get("service_requested") or student.get("service"))

    # Extract mentor services dynamically
    raw_mentor_services = mentor.get("service_types") or mentor.get("services_offered") or mentor.get("services") or []
    if isinstance(raw_mentor_services, str):
        raw_mentor_services = [raw_mentor_services]
    mentor_services = [_clean_str(s) for s in raw_mentor_services]

    # 1. Gender Match
    if student_gender and mentor_gender and student_gender == mentor_gender:
        score += WEIGHTS["gender"]

    # 2. Major Match
    if student_major and mentor_major and student_major == mentor_major:
        score += WEIGHTS["major"]

    # 3. Career -> Industry / Role Match
    if student_career and (mentor_industry or mentor_job_title):
        if (
            (mentor_industry and (student_career in mentor_industry or mentor_industry in student_career))
            or (mentor_job_title and (student_career in mentor_job_title or mentor_job_title in student_career))
        ):
            score += WEIGHTS["career"]

    # 4. Service Requested Match (Dynamic)
    if student_service and mentor_services:
        if any(student_service in ms or ms in student_service for ms in mentor_services):
            score += WEIGHTS.get("service", 25)

    # 5. Dynamic Tag Overlap
    student_tags = set(_clean_str(t) for t in student.get("tags", []))
    if student_service:
        student_tags.add(student_service)
    if student_career:
        student_tags.add(student_career)
    if student_major:
        student_tags.add(student_major)

    mentor_tags = set(_clean_str(t) for t in mentor.get("tags", []))
    for ms in mentor_services:
        if ms:
            mentor_tags.add(ms)
    if mentor_industry:
        mentor_tags.add(mentor_industry)
    if mentor_job_title:
        mentor_tags.add(mentor_job_title)

    matching_tags = student_tags & mentor_tags

    for tag in matching_tags:
        if not tag:
            continue
        if tag in SKILLS or any(sk in tag for sk in SKILLS) or (student_service and tag == student_service):
            score += WEIGHTS["skill"]
        else:
            score += WEIGHTS["interest"]

    return score





def rank_mentors(
    student: Dict,
    mentors: List[Dict]
):

    recommendations = []


    for mentor in mentors:

        score = calculate_match_score(
            student,
            mentor
        )


        recommendations.append(
            {
                "mentor_id": mentor["id"],
                "name": mentor["name"],
                "score": score
            }
        )


    # Highest score first
    return sorted(
        recommendations,
        key=lambda x: x["score"],
        reverse=True
    )