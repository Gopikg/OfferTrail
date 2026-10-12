"""Confidence-based classification for Gmail job-application updates."""

import re


MIN_JOB_CONFIDENCE = 60
HIGH_CONFIDENCE = 75
MEDIUM_CONFIDENCE = 55

NON_APPLICATION_SUBJECT_PATTERNS = [
    re.compile(r"^view .+['’]s post(?:\s|$)", re.I),
    re.compile(r"^.+ shared a post(?:\s|$)", re.I),
]
SUBJECT_SIGNALS = [
    (re.compile(r"\b(interview|phone screen|technical round|hr (round|interview))\b", re.I), 45, "interview language in subject"),
    (re.compile(r"\b(assessment|coding test|coding challenge)\b", re.I), 45, "assessment language in subject"),
    (re.compile(r"\b(job offer|offer letter|pleased to offer|rejected|not moving forward)\b", re.I), 50, "decision language in subject"),
    (re.compile(r"\b(application|shortlisted|shortlist)\b", re.I), 30, "application language in subject"),
]
BODY_SIGNAL_PATTERNS = [
    (re.compile(r"application (received|status|update|has been|was|is)", re.I), "application update in body"),
    (re.compile(r"thank you for (applying|your application)", re.I), "application acknowledgement in body"),
    (re.compile(r"interview (scheduled|invitation|invite|details|confirmation)", re.I), "interview invitation in body"),
    (re.compile(r"(hr|human resources|people) (round|interview)", re.I), "HR interview in body"),
    (re.compile(r"(online|coding)?\s*assessment (invitation|scheduled|details)", re.I), "assessment invitation in body"),
    (re.compile(r"(offer letter|job offer|pleased to offer|not moving forward|regret to inform|you have been shortlisted)", re.I), "application decision in body"),
]


def confidence_level(score):
    """Map a numeric score to the stable labels consumed by the UI."""
    if score >= HIGH_CONFIDENCE:
        return "high"
    if score >= MEDIUM_CONFIDENCE:
        return "medium"
    return "low"


def classify_job_email(subject, sender, body="", extracted=None, threshold=MIN_JOB_CONFIDENCE):
    """Return an explainable 0--100 confidence assessment for one message.

    Evidence is scored once per category, then capped at 100. Messages at or
    above ``threshold`` are shown as job updates; only high confidence should
    be used for unattended imports.
    """
    subject, sender, body = subject or "", sender or "", body or ""
    extracted = extracted or {}
    reasons = []
    if any(pattern.search(subject) for pattern in NON_APPLICATION_SUBJECT_PATTERNS):
        return {"is_job_email": False, "confidence_score": 0, "confidence": "low", "reasons": ["social notification subject"]}

    score = 0
    for pattern, points, reason in SUBJECT_SIGNALS:
        if pattern.search(subject):
            score += points
            reasons.append(reason)

    body_matches = [reason for pattern, reason in BODY_SIGNAL_PATTERNS if pattern.search(body)]
    if body_matches:
        score += 35
        reasons.append(body_matches[0])

    company_score = extracted.get("company_confidence_score", 0)
    if extracted.get("company"):
        score += min(30, round(company_score / 3))
        reasons.append("company extracted")
    if extracted.get("role"):
        score += 20
        reasons.append("role extracted")
    if extracted.get("company") and extracted.get("role"):
        score += 15
        reasons.append("company and role agree")
    if re.search(r"\b(careers?|recruiting|recruitment|talent acquisition)\b", sender, re.I):
        score += 5
        reasons.append("recruiting sender")

    score = min(100, score)
    return {"is_job_email": score >= threshold, "confidence_score": score, "confidence": confidence_level(score), "reasons": reasons}


def is_job_email(subject, sender, body="", extracted=None, threshold=MIN_JOB_CONFIDENCE):
    """Backward-compatible boolean wrapper around ``classify_job_email``."""
    return classify_job_email(subject, sender, body, extracted, threshold)["is_job_email"]
