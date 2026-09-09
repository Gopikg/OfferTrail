import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import db from "./firestore";

function documentsFromSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getCoordinatorProfile(uid) {
  const snapshot = await getDoc(doc(db, "coordinators", uid));

  return snapshot.exists() ? snapshot.data() : null;
}

export async function getStudentProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  return snapshot.exists() ? snapshot.data() : null;
}

export async function getCircles(circleIds) {
  const circles = await Promise.all(
    (circleIds || []).map(async (circleId) => {
      const snapshot = await getDoc(doc(db, "circles", circleId));

      return snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null;
    })
  );

  return circles.filter(Boolean);
}

export async function getAllCircles() {
  const snapshot = await getDocs(collection(db, "circles"));

  return documentsFromSnapshot(snapshot).sort((first, second) => (
    (first.name || first.id).localeCompare(second.name || second.id)
  ));
}

export async function createJobNotice(uid, notice) {
  return addDoc(collection(db, "jobNotices"), {
    ...notice,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateJobNotice(noticeId, notice) {
  return updateDoc(doc(db, "jobNotices", noticeId), {
    ...notice,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJobNotice(noticeId) {
  return deleteDoc(doc(db, "jobNotices", noticeId));
}

export async function getCoordinatorNotices(uid) {
  const snapshot = await getDocs(
    query(collection(db, "jobNotices"), where("createdBy", "==", uid))
  );

  return documentsFromSnapshot(snapshot).sort(sortByNewest);
}

export async function getStudentJobNotices(uid) {
  const profile = await getStudentProfile(uid);
  const circleIds = profile?.circleIds || [];

  if (!circleIds.length) {
    return [];
  }

  const snapshots = await Promise.all(
    circleIds.slice(0, 30).map((circleId) =>
      getDocs(
        query(
          collection(db, "jobNotices"),
          where("status", "==", "published"),
          where("targetCircleId", "==", circleId)
        )
      )
    )
  );

  return snapshots
    .flatMap(documentsFromSnapshot)
    .sort(sortByDeadlineThenNewest);
}

function sortByNewest(first, second) {
  return timestampToMillis(second.createdAt) - timestampToMillis(first.createdAt);
}

function sortByDeadlineThenNewest(first, second) {
  const firstDeadline = first.deadline ? new Date(first.deadline).getTime() : Infinity;
  const secondDeadline = second.deadline ? new Date(second.deadline).getTime() : Infinity;

  if (firstDeadline !== secondDeadline) {
    return firstDeadline - secondDeadline;
  }

  return sortByNewest(first, second);
}

function timestampToMillis(timestamp) {
  return timestamp?.toMillis ? timestamp.toMillis() : 0;
}
