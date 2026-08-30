import re


def extract_company(subject, sender, body):
    text = f"{subject} {sender} {body}"

    companies = [
        "Google",
        "Amazon",
        "Microsoft",
        "Meta",
        "Apple",
        "Accenture",
        "TCS",
        "Infosys",
        "Wipro",
        "Deloitte",
    ]

    for company in companies:
        if company.lower() in text.lower():
            return company

    return ""


def extract_role(subject, body):
    text = f"{subject} {body}"

    patterns = [
        r"position of ([A-Za-z0-9 /-]+)",
        r"position at [A-Za-z0-9 &.-]+ for ([A-Za-z0-9 /-]+)",
        r"for the ([A-Za-z0-9 /-]+) position",
        r"for the ([A-Za-z0-9 /-]+) role",
        r"- ([A-Za-z0-9 /-]+) -",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            role = match.group(1).strip()

            # Remove common trailing words
            role = re.sub(
                r"\s+(position|role)$",
                "",
                role,
                flags=re.IGNORECASE
            )

            return role

    return ""


def extract_stage(subject, body):
    text = f"{subject} {body}".lower()

    if any(
        phrase in text
        for phrase in [
            "rejected",
            "regret to inform",
            "not moving forward",
        ]
    ):
        return "Rejected"

    if any(
        phrase in text
        for phrase in [
            "offer letter",
            "job offer",
            "pleased to offer",
            "we are delighted to offer",
            "we are happy to offer",
        ]
    ):
        return "Offer"

    if any(
        phrase in text
        for phrase in [
            "hr round",
            "hr interview",
            "human resources interview",
            "human resources round",
            "people interview",
            "people round",
            "final hr",
        ]
    ):
        return "HR"

    if any(
        phrase in text
        for phrase in [
            "interview scheduled",
            "interview invitation",
            "invite you to an interview",
            "phone screen",
            "technical interview",
            "interview",
        ]
    ):
        return "Interview"

    if any(
        phrase in text
        for phrase in [
            "online assessment",
            "assessment invitation",
            "complete an assessment",
            "coding assessment",
            "coding challenge",
        ]
    ):
        return "OA"

    if any(
        phrase in text
        for phrase in [
            "application received",
            "received your application",
            "thank you for applying",
            "application confirmation",
        ]
    ):
        return "Applied"

    return "Applied"


def extract_application_data(subject, sender, body):
    return {
        "company": extract_company(
            subject,
            sender,
            body
        ),
        "role": extract_role(
            subject,
            body
        ),
        "stage": extract_stage(
            subject,
            body
        ),
    }
