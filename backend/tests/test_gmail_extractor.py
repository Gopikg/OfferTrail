import base64
import unittest

from app.services.gmail_extractor import extract_application_data
from app.services.gmail_classifier import classify_job_email, is_job_email
from app.services.gmail_message import extract_body


class GmailExtractorTests(unittest.TestCase):
    def test_extracts_an_unlisted_company_from_subject(self):
        extracted = extract_application_data(
            "Northstar Labs - Interview Invitation",
            "Northstar Labs Careers <jobs@northstarlabs.example>",
            "We would like to invite you to interview for the Software Engineer role.",
        )
        self.assertEqual(extracted["company"], "Northstar Labs")
        self.assertEqual(extracted["role"], "Software Engineer")
        self.assertEqual(extracted["stage"], "Interview")
        self.assertEqual(extracted["confidence"], "high")

    def test_extracts_company_from_body_without_a_known_name(self):
        extracted = extract_application_data(
            "Your application update",
            "Recruiting <team@example.com>",
            "Your application to Cedar & Stone has progressed. Thank you for applying.",
        )
        self.assertEqual(extracted["company"], "Cedar & Stone")
        self.assertEqual(extracted["confidence"], "medium")

    def test_does_not_guess_a_company_from_a_generic_email(self):
        extracted = extract_application_data(
            "Interview invitation",
            "Recruiting <jobs@example.com>",
            "Your interview is scheduled for next week.",
        )
        self.assertEqual(extracted["company"], "")
        self.assertEqual(extracted["confidence"], "low")

    def test_classifier_accepts_explicit_company_and_role_with_unusual_wording(self):
        subject = "Northstar Labs - Hiring update"
        body = "We are looking forward to talking about the Data Engineer position at Northstar Labs."
        extracted = extract_application_data(subject, "Careers <jobs@example.com>", body)

        self.assertTrue(is_job_email(subject, "Careers <jobs@example.com>", body, extracted))

    def test_classifier_returns_high_confidence_for_multiple_independent_signals(self):
        subject = "Northstar Labs - Interview Invitation"
        sender = "Northstar Labs Careers <jobs@example.com>"
        body = "Your interview for the Software Engineer role is scheduled."
        extracted = extract_application_data(subject, sender, body)

        result = classify_job_email(subject, sender, body, extracted)

        self.assertTrue(result["is_job_email"])
        self.assertEqual(result["confidence"], "high")
        self.assertGreaterEqual(result["confidence_score"], 75)

    def test_classifier_keeps_ambiguous_application_language_below_threshold(self):
        result = classify_job_email(
            "Application update",
            "News <news@example.com>",
            "Read our latest company update.",
        )

        self.assertFalse(result["is_job_email"])
        self.assertEqual(result["confidence"], "low")

    def test_classifier_rejects_social_notifications_even_with_job_words(self):
        result = classify_job_email(
            "View Maya's post",
            "LinkedIn <mail@linkedin.com>",
            "We are hiring Software Engineers.",
        )

        self.assertFalse(result["is_job_email"])
        self.assertEqual(result["confidence_score"], 0)

    def test_classifier_does_not_accept_interview_tips_from_one_weak_signal(self):
        result = classify_job_email(
            "Interview tips for candidates",
            "Newsletter <news@example.com>",
            "Prepare for your next interview with these tips.",
            {"stage": "Interview"},
        )

        self.assertFalse(result["is_job_email"])
        self.assertEqual(result["confidence_score"], 45)

    def test_extract_body_falls_back_to_html_only_messages(self):
        html = "<html><body><p>Your interview is scheduled.</p><script>ignore()</script></body></html>"
        encoded = base64.urlsafe_b64encode(html.encode()).decode().rstrip("=")

        self.assertEqual(
            extract_body({"mimeType": "text/html", "body": {"data": encoded}}),
            "Your interview is scheduled.",
        )


if __name__ == "__main__":
    unittest.main()
