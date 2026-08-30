# Public placement overview: first testable slice

The public home page reads exactly one Firestore document:

`public/placementOverview`

Create that document in Firestore with the following fields to verify the page:

```json
{
  "companiesVisited": 32,
  "totalOffers": 181,
  "placementRate": 94,
  "averagePackageLpa": 9.2,
  "highestPackageLpa": 42
}
```

The values shown are only example setup data; use your institution's verified figures.

For this dashboard to be publicly readable, the deployed Firestore rules must allow unauthenticated reads of this one document while keeping writes restricted to an administrator-managed workflow. That workflow is deliberately deferred to the next slice.
