import re


# These notifications often contain hiring-related language in their body, but
# they are not updates to the user's own job applications.
NON_APPLICATION_SUBJECT_PATTERNS = [
    re.compile(r"^view .+['’]s post(?:\s|$)", re.IGNORECASE),
    re.compile(r"^.+ shared a post(?:\s|$)", re.IGNORECASE),
]

SUBJECT_SIGNALS = [
    "application",
    "interview",
    "assessment",
    "coding test",
    "technical round",
    "hr round",
    "hr interview",
    "human resources",
    "phone screen",
    "shortlisted",
    "shortlist",
    "job offer",
    "offer letter",
    "rejected",
    "not moving forward",
]

# Broad terms such as "career", "hiring", and "candidate" are intentionally
# excluded: they occur frequently in newsletters and social notifications.
BODY_SIGNAL_PATTERNS = [
    re.compile(r"application (received|status|update|has been|was|is)", re.I),
    re.compile(r"thank you for (applying|your application)", re.I),
    re.compile(r"interview (scheduled|invitation|invite|details|confirmation)", re.I),
    re.compile(r"(hr|human resources|people) (round|interview)", re.I),
    re.compile(r"(online|coding)?\s*assessment (invitation|scheduled|details)", re.I),
    re.compile(r"(offer letter|job offer|pleased to offer)", re.I),
    re.compile(r"(not moving forward|regret to inform|you have been shortlisted)", re.I),
]


def is_job_email(subject, sender, body=""):
    subject = subject or ""

    if any(pattern.search(subject) for pattern in NON_APPLICATION_SUBJECT_PATTERNS):
        return False

    subject_lower = subject.lower()

    if any(signal in subject_lower for signal in SUBJECT_SIGNALS):
        return True

    return any(pattern.search(body or "") for pattern in BODY_SIGNAL_PATTERNS)
