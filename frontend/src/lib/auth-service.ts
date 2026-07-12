"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";

export interface WalletUser {
  uid: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
  hasWallet?: boolean;
}

/**
 * Registers a new user account strictly via Firebase.
 */
export async function registerUser(email: string, password: string, username: string): Promise<WalletUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error("La conexión a Firebase no está configurada correctamente.");
  }

  // Firebase Registration Flow
  auth.languageCode = "es";
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const firebaseUser = userCredential.user;

  await sendEmailVerification(firebaseUser);

  // Store user data in Firestore
  const userRef = doc(db, "users", firebaseUser.uid);
  await setDoc(userRef, {
    uid: firebaseUser.uid,
    email: cleanEmail,
    username: username.trim(),
    hasWallet: false,
    createdAt: new Date().toISOString()
  });

  return {
    uid: firebaseUser.uid,
    email: cleanEmail,
    username: username.trim(),
    emailVerified: false, // recién registrado, aún no verificado
    hasWallet: false
  };
}

/**
 * Logs in an existing user strictly via Firebase.
 */
export async function loginUser(email: string, password: string): Promise<WalletUser> {
  const cleanEmail = email.trim().toLowerCase();

  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error("La conexión a Firebase no está configurada correctamente.");
  }

  // Firebase Login Flow
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const firebaseUser = userCredential.user;

  // Fetch user data from Firestore to get the real hasWallet status
  let hasWallet = false;
  
  // OPTIMIZATION 1: Check local storage first. It's instantaneous.
  const localKey = `aether_wallet_encrypted_${firebaseUser.uid}`;
  if (typeof window !== "undefined" && localStorage.getItem(localKey)) {
    hasWallet = true;
  } else {
    // OPTIMIZATION 2: If not in local storage, check Firestore but with a strict 3-second timeout
    // to prevent Google Cloud gRPC retries from freezing the login screen for 10+ seconds.
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore Timeout")), 3000));
      const docPromise = getDoc(doc(db, "users", firebaseUser.uid));
      const userDoc = await Promise.race([docPromise, timeoutPromise]) as any;
      
      if (userDoc && userDoc.exists && userDoc.exists()) {
        hasWallet = userDoc.data().hasWallet === true;
      }
    } catch (err) {
      console.warn("Skipping slow Firestore check on login due to timeout or error.");
    }
  }

  return {
    uid: firebaseUser.uid,
    email: cleanEmail,
    username: null,
    emailVerified: firebaseUser.emailVerified,
    hasWallet
  };
}

/**
 * Logs out the active user session.
 */
export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}

/**
 * Checks for a persisting active session (Instant sync).
 */
export function getPersistedSession(): WalletUser | null {
  if (typeof window === "undefined") return null;
  
  if (isFirebaseConfigured && auth) {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        username: null, // Will be hydrated later via subscribeToAuth
        emailVerified: firebaseUser.emailVerified
      };
    }
  }
  
  return null;
}

export function subscribeToAuth(callback: (user: WalletUser | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    return () => {};
  }

  let firestoreUnsub: (() => void) | null = null;

  const authUnsub = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }

    if (firebaseUser) {
      // Only emit user data AFTER Firestore confirms the real hasWallet status.
      // This prevents the race condition where hasWallet:false overwrites the correct value.
      if (db) {
        firestoreUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (userSnap) => {
          let username = null;
          let hasWallet = false;
          if (userSnap.exists()) {
            username = userSnap.data().username;
            hasWallet = userSnap.data().hasWallet || false;
          }
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            username,
            emailVerified: firebaseUser.emailVerified,
            hasWallet
          });
        }, (error: any) => {
          if (!error?.message?.includes("client is offline")) {
            console.warn("Firestore snapshot fetch error:", error?.message);
          }
          // On Firestore error, fall back to basic auth data without hasWallet
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            username: null,
            emailVerified: firebaseUser.emailVerified,
            hasWallet: false
          });
        });
      } else {
        // No Firestore available, emit basic auth data
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          username: null,
          emailVerified: firebaseUser.emailVerified,
          hasWallet: false
        });
      }
    } else {
      callback(null);
    }
  });

  return () => {
    if (firestoreUnsub) firestoreUnsub();
    authUnsub();
  };
}

/**
 * Sends a verification email to the currently logged-in Firebase user.
 */
export async function resendVerificationEmail(): Promise<void> {
  if (isFirebaseConfigured && auth?.currentUser) {
    auth.languageCode = "es";
    await sendEmailVerification(auth.currentUser);
  }
}

/**
 * Reloads the Firebase user and checks if their email is now verified.
 */
export async function checkEmailVerified(): Promise<boolean> {
  if (isFirebaseConfigured && auth?.currentUser) {
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  }
  return true;
}

/**
 * Marks the user's wallet as created in the database.
 */
export async function markWalletCreated(uid: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { hasWallet: true }, { merge: true });
    } catch (e) {
      console.warn("Failed to mark wallet as created in Firestore", e);
    }
  }
}

/**
 * Updates the user's username in the database.
 */
export async function updateUsername(uid: string, newUsername: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { username: newUsername.trim() }, { merge: true });
    } catch (e) {
      console.warn("Failed to update username in Firestore", e);
      throw e;
    }
  }
}

/**
 * Directly checks Firestore to see if the user already has a wallet.
 * This is an independent one-shot query, not affected by reactive state race conditions.
 */
export async function checkHasWallet(uid: string): Promise<boolean> {
  // OPTIMIZATION 1: Check local storage first for instant response
  const localKey = `aether_wallet_encrypted_${uid}`;
  if (typeof window !== "undefined" && localStorage.getItem(localKey)) {
    return true;
  }

  if (!isFirebaseConfigured || !db) return false;
  
  // OPTIMIZATION 2: Strict 3-second timeout for Firestore to prevent blocking the UI
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore Timeout")), 3000));
    const docPromise = getDoc(doc(db, "users", uid));
    const userDoc = await Promise.race([docPromise, timeoutPromise]) as any;
    
    if (userDoc && userDoc.exists && userDoc.exists()) {
      return userDoc.data().hasWallet === true;
    }
  } catch (e) {
    console.warn("Failed to check hasWallet in Firestore (timeout or network):", e);
  }
  return false;
}
