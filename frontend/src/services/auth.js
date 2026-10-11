import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import app from "../firebase";
import db from "./firestore";

const auth = getAuth(app);

export async function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogleAsStudent() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  const { user } = credential;

  try {
    if (!user.email) {
      throw new Error("A Google account with an email address is required.");
    }

    const [adminSnapshot, coordinatorSnapshot, profileSnapshot] = await Promise.all([
      getDoc(doc(db, "admins", user.uid)),
      getDoc(doc(db, "coordinators", user.uid)),
      getDoc(doc(db, "users", user.uid)),
    ]);

    if (adminSnapshot.exists() || coordinatorSnapshot.exists()) {
      throw new Error(
        "Google sign-in is available for student accounts only. Please use your staff sign-in method."
      );
    }

    if (profileSnapshot.exists() && profileSnapshot.data().role !== "student") {
      throw new Error("This account is not configured as a student account.");
    }

    if (!profileSnapshot.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        role: "student",
        email: user.email,
        createdAt: serverTimestamp(),
      });
    }

    return credential;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function logout() {
  return signOut(auth);
}

export default auth;
