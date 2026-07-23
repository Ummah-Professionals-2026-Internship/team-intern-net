"""
Master list of all tags:

Tags are stored in the database and later can be
served dynamically to the frontend
"""
from pathlib import Path
import csv

DATA_DIR = Path(__file__).parent / "data"

SKILLS_FILE = DATA_DIR / "linkedin_skills.txt"
MAJORS_FILE = DATA_DIR / "majors-list.csv"


def load_skills():
    skills = []

    with open(SKILLS_FILE, encoding="utf-8") as f:
        for line in f:
            skill = line.strip()

            if skill:
                skills.append(skill)

    return sorted(set(skills))


def load_majors():
    majors = []

    with open(MAJORS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        print("CSV columns:", reader.fieldnames)

        for row in reader:

            major = (
                row.get("MAJOR")
                or row.get("Major")
                or row.get("major")
            )

            if major:
                majors.append(major.strip())

    return sorted(set(majors))

CAREERS = [
    "Software Engineer",
    "Data Scientist",
    "Cybersecurity Analyst",
    "Product Manager",
    "Financial Analyst",
    "Accountant",
    "Physician",
    "Nurse",
]

INDUSTRIES = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Government",
]

SERVICES = [
    "Mock Interview",
    "Resume Review",
    "Career Advice",
]