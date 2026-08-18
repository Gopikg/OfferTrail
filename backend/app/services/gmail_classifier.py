JOB_KEYWORDS = [
    "application",
    "applied",
    "recruitment",
    "recruiter",
    "interview",
    "interviewing",
    "assessment",
    "online assessment",
    "coding test",
    "technical round",
    "hr round",
    "shortlisted",
    "shortlist",
    "offer",
    "job offer",
    "candidate",
    "hiring",
    "career",
    "job opportunity",
    "selection",
    "rejected",
    "application status",
]


def is_job_email(subject, sender):
    text = f"{subject} {sender}".lower()

    return any(
        keyword in text
        for keyword in JOB_KEYWORDS
    )