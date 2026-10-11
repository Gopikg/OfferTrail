import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import auth from "../services/auth";
import db from "../services/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({ isPlacementAdmin: false, isCoordinator: false });
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        setAccess({ isPlacementAdmin: false, isCoordinator: false });
        setAccessLoading(false);
        return;
      }

      setAccessLoading(true);

      try {
        const [adminSnapshot, coordinatorSnapshot] = await Promise.all([
          getDoc(doc(db, "admins", currentUser.uid)),
          getDoc(doc(db, "coordinators", currentUser.uid)),
        ]);

        setAccess({
          isPlacementAdmin: adminSnapshot.exists(),
          isCoordinator: coordinatorSnapshot.exists(),
        });
      } catch (error) {
        console.error("Failed to load account access:", error);
        setAccess({ isPlacementAdmin: false, isCoordinator: false });
      } finally {
        setAccessLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, access, accessLoading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
