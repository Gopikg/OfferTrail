# Coordinator Foundation sprint: Firestore setup

This sprint adds targeted job notices. Placement staff set up identities and group membership in Firebase Console (or through a trusted admin workflow); students and coordinators cannot grant themselves access from the client.

## Deploy the rules

Merge `firestore.rules` with any rules already deployed for the project, then deploy it through Firebase CLI or paste the equivalent into the Firestore Rules console. Do not replace unrelated production rules without reviewing them first.

The rules in this repository preserve the current paths used by OfferTrail:

- `users/<uid>/applications/<applicationId>`: private to the student.
- `admins/<uid>`: enables the existing placement overview editor.
- `gmail_connections/<uid>` is only used by the backend with Firebase Admin SDK, which bypasses Firestore security rules.

## Seed a coordinator test account

Create the following documents with Firebase Console, substituting real Firebase Authentication UIDs:

```text
circles/mca-2026
  name: "MCA 2026"
  description: "MCA students graduating in 2026"

coordinators/<COORDINATOR_UID>
  role: "offer-coordinator"
  circleIds: ["mca-2026"]

users/<STUDENT_UID>
  circleIds: ["mca-2026"]
```

The parent `users/<uid>` document is deliberately placement-managed. The existing application records stay at `users/<uid>/applications/*`.

## Acceptance test

1. Sign in as the coordinator and open `/offer-coordinator`.
2. Publish a notice to **MCA 2026**.
3. Sign in as the assigned student and open `/dashboard`.
4. Confirm the notice is visible under **Job notices**, then choose **Add to applications**.
5. Confirm the application is prefilled and marked as coming from the coordinator notice.

An account outside `mca-2026` must not be able to read that notice.

## Notice lifecycle

Coordinators can save a notice as a **draft** or publish it. Drafts are visible only to their creator; only published notices appear in the student dashboard. Coordinators can edit or delete their own notices.

After pulling the Notice Management sprint, redeploy the updated `firestore.rules`. It now explicitly limits a notice status to `draft` or `published`.

## Coordinator access requests

Registration always creates a student profile. A user may also request offer-coordinator access; this creates a pending request only. The placement-cell administrator reviews requests at `/placement-admin`, chooses a circle, and approves or rejects each request. Approval creates `coordinators/<UID>` securely from the administrator account.

## Circle management

Placement-cell administrators can now create circles and assign or remove registered students directly at `/placement-admin`. This replaces the previous manual Firestore membership setup for new students.

Placement-cell administrators can also change an approved coordinator’s publishing circles from the same workspace. A coordinator never grants themselves access to a circle.
