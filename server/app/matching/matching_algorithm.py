from typing import List, Dict


WEIGHTS = {
    "gender": 20,
    "major": 15,
    "career": 25,
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


def calculate_match_score(
    student: Dict,
    mentor: Dict
) -> int:

    score = 0


    # Gender Match
    if (
        student.get("gender")
        and mentor.get("gender")
        and student["gender"].lower()
        == mentor["gender"].lower()
    ):
        score += WEIGHTS["gender"]



    # Major Match
    if (
        student.get("major")
        and mentor.get("major")
        and student["major"].lower()
        ==
        mentor["major"].lower()
    ):
        score += WEIGHTS["major"]



    # Career -> Industry Match
    if (
        student.get("desired_career")
        and mentor.get("industry")
    ):

        career = student["desired_career"].lower()
        industry = mentor["industry"].lower()

        if (
            career in industry
            or industry in career
        ):
            score += WEIGHTS["career"]



    # Tag Matching

    student_tags = set(
        tag.lower()
        for tag in student.get("tags", [])
    )


    mentor_tags = set(
        tag.lower()
        for tag in mentor.get("tags", [])
    )


    matching_tags = (
        student_tags
        &
        mentor_tags
    )


    for tag in matching_tags:

        if tag in SKILLS:
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