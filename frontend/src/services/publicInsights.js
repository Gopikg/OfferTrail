import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import db from "./firestore";

export const PUBLIC_OVERVIEW_PATH = "public/placementOverview";

export async function getPublicPlacementOverview() {
  const snapshot = await getDoc(doc(db, "public", "placementOverview"));

  return snapshot.exists() ? snapshot.data() : null;
}

export async function isPlacementAdmin(uid) {
  const snapshot = await getDoc(doc(db, "admins", uid));

  return snapshot.exists();
}

export async function savePublicPlacementOverview(uid, overview) {
  await setDoc(
    doc(db, "public", "placementOverview"),
    {
      ...overview,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true }
  );
}
