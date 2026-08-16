import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import app from "../firebase";

const db = getFirestore(app);

export async function addApplication(uid, application) {
  return await addDoc(
    collection(db, "users", uid, "applications"),
    {
      ...application,
      stageHistory: [
        {
          stage: application.stage,
          changedAt: new Date().toISOString(),
        },
      ],
      createdAt: serverTimestamp(),
    }
  );
}

export async function getApplications(uid) {
  const snapshot = await getDocs(
    collection(db, "users", uid, "applications")
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function updateApplication(
  uid,
  applicationId,
  application,
  previousStage
) {
  const applicationRef = doc(
    db,
    "users",
    uid,
    "applications",
    applicationId
  );

  const updateData = {
    ...application,
    updatedAt: serverTimestamp(),
  };

  if (application.stage !== previousStage) {
    updateData.stageHistory = arrayUnion({
      stage: application.stage,
      changedAt: new Date().toISOString(),
    });
  }

  return await updateDoc(applicationRef, updateData);
}

export async function deleteApplication(uid, applicationId) {
  const applicationRef = doc(
    db,
    "users",
    uid,
    "applications",
    applicationId
  );

  return await deleteDoc(applicationRef);
}

export default db;