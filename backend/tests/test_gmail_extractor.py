import unittest

from app.services.gmail_extractor import extract_application_data
from app.services.gmail_classifier import is_job_email


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


if __name__ == "__main__":
    unittest.main()
