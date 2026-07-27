import {
  getFirestore,
  collection,
  addDoc,
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

export default db;