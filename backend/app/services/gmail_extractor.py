import re
from email.utils import parseaddr


GENERIC_COMPANY_WORDS = {
    "application", "candidate", "career", "careers", "company", "hiring",
    "hr", "human resources", "job", "jobs", "recruiting", "recruitment",
    "talent", "team", "the team", "your application", "your interview",
    "application update", "job application",
}

# Extraction source quality. These scores are intentionally separate from the
# final message score calculated by gmail_classifier.
COMPANY_CONFIDENCE_SCORES = {"high": 90, "medium": 65, "low": 35}


def clean_value(value):
    """Normalize a name extracted from an email without inventing one."""
    value = re.sub(r"\s+", " ", (value or "")).strip(" -–—:|,.;()[]{}\"'")
    value = re.sub(r"^(the|our)\s+", "", value, flags=re.IGNORECASE)
    return value[:100]


def valid_company(value):
    normalized = clean_value(value)
    return (
        len(normalized) >= 2
        and normalized.lower() not in GENERIC_COMPANY_WORDS
        and not re.fullmatch(r"(?:your|this|our) (?:application|interview|assessment)", normalized, re.I)
    )


def extract_company(subject, sender, body):
    """Find an explicitly named employer without maintaining an allow-list."""
    subject = subject or ""
    body = body or ""
    text = f"{subject}\n{body}"

    subject_patterns = [
        r"^\s*(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)\s*[-|:–—]\s*(?:application|interview|assessment|offer|recruitment|careers?|hiring)\b",
        r"\b(?:application|interview|assessment|offer)\s+(?:update|invitation|confirmation)\s+(?:from|at|with)\s+(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)(?:\s*[-|:–—]|$)",
    ]
    body_patterns = [
        r"\b(?:your|the)\s+(?:application|candidacy)\s+(?:to|at|with|for)\s+(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)(?=\s+(?:for|has|is|was|will|position|role|job)\b|[,.!\n]|$)",
        r"\bthank you for (?:applying|your interest)\s+(?:to|at|with)\s+(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)(?=[,.!\n]|$)",
        r"\b(?:the )?(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)\s+(?:recruiting|recruitment|talent acquisition|talent|careers?)\s+team\b",
        r"\b(?:join|interview with|speak with)\s+(?P<company>[A-Za-z0-9][A-Za-z0-9&.' -]{1,80}?)(?=[,.!\n]|$)",
    ]

    for pattern in subject_patterns:
        match = re.search(pattern, subject, re.IGNORECASE)
        if match and valid_company(match.group("company")):
            return clean_value(match.group("company")), "high"

    for pattern in body_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match and valid_company(match.group("company")):
            return clean_value(match.group("company")), "medium"

    display_name, _ = parseaddr(sender or "")
    display_match = re.search(
        r"^(?P<company>.+?)\s+(?:careers?|recruiting|recruitment|talent)(?:\s+team)?$",
        display_name,
        re.IGNORECASE,
    )
    if display_match and valid_company(display_match.group("company")):
        return clean_value(display_match.group("company")), "low"

    return "", "low"


def extract_role(subject, body):
    text = f"{subject or ''}\n{body or ''}"
    patterns = [
        r"\bposition\s+at\s+[^,.\n]+?\s+for\s+(?P<role>[A-Za-z0-9 /&+-]{2,80}?)(?=[,.!\n]|$)",
        r"\b(?:position|role|job)\s+(?:of|as)\s+(?P<role>[A-Za-z0-9 /&+-]{2,80}?)(?=\s+(?:at|with|for)\b|[,.!\n]|$)",
        r"\b(?:for|regarding|about)\s+(?:the\s+)?(?P<role>[A-Za-z0-9 /&+-]{2,80}?)\s+(?:position|role|job)\b",
        r"\b(?:application|interview|assessment)\s+for\s+(?:the\s+)?(?P<role>[A-Za-z0-9 /&+-]{2,80}?)(?=\s+(?:at|with)\b|[,.!\n]|$)",
        r"\b(?P<role>[A-Za-z0-9 /&+-]{2,80}?)\s+(?:position|role)\s+at\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            role = clean_value(match.group("role"))
            if role.lower() not in {"a", "an", "the", "your application"}:
                return role
    return ""


def extract_stage(subject, body):
    text = f"{subject} {body}".lower()
    if any(phrase in text for phrase in ["rejected", "regret to inform", "not moving forward"]):
        return "Rejected"
    if any(phrase in text for phrase in ["offer letter", "job offer", "pleased to offer", "delighted to offer", "happy to offer"]):
        return "Offer"
    if any(phrase in text for phrase in ["hr round", "hr interview", "human resources interview", "human resources round", "people interview", "people round", "final hr"]):
        return "HR"
    if any(phrase in text for phrase in ["interview scheduled", "interview invitation", "invite you to an interview", "phone screen", "technical interview", "interview"]):
        return "Interview"
    if any(phrase in text for phrase in ["online assessment", "assessment invitation", "complete an assessment", "coding assessment", "coding challenge"]):
        return "OA"
    return "Applied"


def extract_application_data(subject, sender, body):
    company, company_confidence = extract_company(subject, sender, body)
    role = extract_role(subject, body)
    stage = extract_stage(subject, body)
    confidence = "high" if company_confidence == "high" and role else company_confidence
    return {
        "company": company,
        "role": role,
        "stage": stage,
        # This is field-level confidence. The route replaces it with the
        # classifier's combined confidence after assessing the whole email.
        "confidence": confidence,
        "company_confidence_score": (
            COMPANY_CONFIDENCE_SCORES[company_confidence] if company else 0
        ),
    }
