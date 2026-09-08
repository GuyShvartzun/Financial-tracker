import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';

export function useAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userData = {
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email.toLowerCase(),
          photoURL: user.photoURL || '',
          lastLogin: new Date().toISOString()
        };
        setAuthUser(userData);

        // Save / update in Firestore users/{user.uid}
        if (db) {
          try {
            await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
          } catch (err) {
            console.warn("User profile sync notice:", err);
          }
        }
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!auth) return;
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const logoutGoogle = useCallback(async () => {
    if (!auth) return;
    try { 
      await signOut(auth); 
      setAuthUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }, []);

  return {
    authUser,
    setAuthUser,
    authLoading,
    loginWithGoogle,
    logoutGoogle
  };
}
