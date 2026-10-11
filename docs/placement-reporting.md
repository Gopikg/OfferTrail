# Placement reporting

Placement intelligence is managed through `placementReports` documents. Each
document is staff-only and includes an academic year, an as-of date, a draft or
published status, editor identifiers, timestamps, and metrics.

Publishing a report writes a separate `public/placementOverview` projection in
the same Firestore batch. The home page reads only that projection, never a
staff draft. A public report therefore includes its academic year, as-of date,
and last-updated timestamp.

Before a report can be published, OfferTrail requires all overview metrics,
limits placement rate to 0–100, rejects negative values, requires a unique
month for each activity entry, and ensures the average package does not exceed
the highest package. Drafts may be incomplete.

Deploy the updated Firestore rules with the application release; otherwise the
draft collection will not be protected as intended.
