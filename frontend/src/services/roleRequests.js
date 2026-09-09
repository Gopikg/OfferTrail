import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import db from "./firestore";

export async function createStudentProfile(uid, email) {
  return setDoc(doc(db, "users", uid), {
    role: "student",
    email,
    createdAt: serverTimestamp(),
  });
}

export async function requestCoordinatorAccess(uid, email) {
  return setDoc(doc(db, "coordinatorRequests", uid), {
    email,
    status: "pending",
    requestedAt: serverTimestamp(),
  });
}

export async function getPendingCoordinatorRequests() {
  const snapshot = await getDocs(
    query(
      collection(db, "coordinatorRequests"),
      where("status", "==", "pending")
    )
  );

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function approveCoordinatorRequest({
  requestId,
  adminUid,
  circleId,
  email,
}) {
  const batch = writeBatch(db);
  const reviewedAt = serverTimestamp();

  batch.set(doc(db, "coordinators", requestId), {
    role: "offer-coordinator",
    email,
    circleIds: [circleId],
    approvedBy: adminUid,
    approvedAt: reviewedAt,
  });
  batch.update(doc(db, "coordinatorRequests", requestId), {
    status: "approved",
    reviewedBy: adminUid,
    reviewedAt,
  });

  return batch.commit();
}

export async function rejectCoordinatorRequest(requestId, adminUid) {
  return updateDoc(doc(db, "coordinatorRequests", requestId), {
    status: "rejected",
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  });
}

export async function getStudentProfiles() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((profile) => profile.role === "student")
    .sort((first, second) => (first.email || first.id).localeCompare(second.email || second.id));
}

export async function createCircle({ name, description, adminUid }) {
  return addDoc(collection(db, "circles"), {
    name,
    description,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  });
}

export async function addStudentToCircle(studentUid, circleId) {
  return updateDoc(doc(db, "users", studentUid), {
    circleIds: arrayUnion(circleId),
  });
}

export async function removeStudentFromCircle(studentUid, circleId) {
  return updateDoc(doc(db, "users", studentUid), {
    circleIds: arrayRemove(circleId),
  });
}

export async function getCoordinatorProfiles() {
  const snapshot = await getDocs(collection(db, "coordinators"));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((first, second) => (first.email || first.id).localeCompare(second.email || second.id));
}

export async function addCoordinatorToCircle(coordinatorUid, circleId) {
  return updateDoc(doc(db, "coordinators", coordinatorUid), {
    circleIds: arrayUnion(circleId),
  });
}

export async function removeCoordinatorFromCircle(coordinatorUid, circleId) {
  return updateDoc(doc(db, "coordinators", coordinatorUid), {
    circleIds: arrayRemove(circleId),
  });
}
