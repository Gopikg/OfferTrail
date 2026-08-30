# Placement-cell editor: test setup

The editor is available at `/placement-admin` after sign-in. To grant a user access for this test slice:

1. Sign in with the intended placement-cell account.
2. In Firebase Authentication, copy that user's **UID**.
3. In Firestore, create the document `admins/<UID>` with any field, for example:

```json
{ "role": "placement-cell" }
```

4. Visit `/placement-admin`. Publish a set of figures and verify the public home page updates after reload.

## Required Firestore-rule intent

The live Firestore rules must enforce this server-side. Add an equivalent rule to the project's existing rules before relying on the editor:

```text
match /public/placementOverview {
  allow read: if true;
  allow write: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /admins/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false;
}
```

Do not replace the project’s existing rules wholesale: merge these matches with its current user-application and Gmail-connection rules.
