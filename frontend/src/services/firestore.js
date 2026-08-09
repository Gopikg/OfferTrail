import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";  

import app from "../firebase";

const db = getFirestore(app);

export async function addApplication(uid, application) {
  return await addDoc(
    collection(db, "users", uid, "applications"),
    {
      ...application,
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
export async function updateApplication(uid, applicationId, application) {
  const applicationRef = collection(
    db,
    "users",
    uid,
    "applications"
  );

  return await updateDoc(
    doc(applicationRef, applicationId),
    {
      ...application,
      updatedAt: serverTimestamp(),
    }
  );
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