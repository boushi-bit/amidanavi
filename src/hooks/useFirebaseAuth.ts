"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useFirebaseAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activatedRef = useRef(false);
  const [active, setActive] = useState(false);

  const activate = useCallback(() => {
    if (!activatedRef.current) {
      activatedRef.current = true;
      setActive(true);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the new user
        } catch (err) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [active]);

  return { uid, loading, error, activate };
}
