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
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";

export interface WalletUser {
  uid: string;
  email: string;
  username: string | null;
}

// Helper to calculate SHA-256 hash client-side for simulated auth passwords
async function hashPassword(password: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return password; // Fallback for pure SSR
  }
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Database type for local simulated fallback auth
interface SimulatedUser {
  uid: string;
  email: string;
  username: string | null;
  passwordHash: string;
  createdAt: string;
}

const LOCAL_USERS_KEY = "aether_simulated_users";
const ACTIVE_SESSION_KEY = "aether_simulated_active_session";

function getLocalUsers(): Record<string, SimulatedUser> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(LOCAL_USERS_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveLocalUsers(users: Record<string, SimulatedUser>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }
}

/**
 * Registers a new user account.
 * Supports Firebase and simulated LocalStorage fallback.
 */
export async function registerUser(email: string, password: string, username: string): Promise<WalletUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (isFirebaseConfigured && auth && db) {
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
      createdAt: new Date().toISOString()
    });

    return {
      uid: firebaseUser.uid,
      email: cleanEmail,
      username: username.trim()
    };
  } else {
    // Local Simulated Registration Flow
    const users = getLocalUsers();
    if (users[cleanEmail]) {
      throw new Error("El correo electrónico ya se encuentra registrado.");
    }

    const uid = "sim_" + Math.random().toString(36).substring(2, 15);
    const passwordHash = await hashPassword(password);
    
    const newUser: SimulatedUser = {
      uid,
      email: cleanEmail,
      username: username.trim(),
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users[cleanEmail] = newUser;
    saveLocalUsers(users);

    // Save active session in localStorage
    const walletUser: WalletUser = {
      uid,
      email: cleanEmail,
      username: username.trim()
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(walletUser));

    return walletUser;
  }
}

/**
 * Logs in an existing user.
 * Supports Firebase and simulated LocalStorage fallback.
 */
export async function loginUser(email: string, password: string): Promise<WalletUser> {
  const cleanEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && auth && db) {
    // Firebase Login Flow
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const firebaseUser = userCredential.user;

    // Fetch username from Firestore
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const username = userSnap.exists() ? userSnap.data().username : null;

    return {
      uid: firebaseUser.uid,
      email: cleanEmail,
      username: username
    };
  } else {
    // Local Simulated Login Flow
    const users = getLocalUsers();
    const user = users[cleanEmail];
    
    if (!user) {
      throw new Error("Usuario no encontrado o credenciales inválidas.");
    }

    const calculatedHash = await hashPassword(password);
    if (user.passwordHash !== calculatedHash) {
      throw new Error("Contraseña incorrecta.");
    }

    const walletUser: WalletUser = {
      uid: user.uid,
      email: user.email,
      username: user.username
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(walletUser));

    return walletUser;
  }
}

/**
 * Logs out the active user session.
 */
export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  } else {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }
}

/**
 * Checks for a persisting active session.
 * Used for instant session recovery.
 */
export function getPersistedSession(): WalletUser | null {
  if (typeof window === "undefined") return null;
  
  if (isFirebaseConfigured && auth) {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        username: null // Username would be updated asynchronously in Zustand
      };
    }
  }
  
  // Simulated mode fallback read
  const sessionStr = localStorage.getItem(ACTIVE_SESSION_KEY);
  return sessionStr ? JSON.parse(sessionStr) : null;
}

/**
 * Subscribes to authentication state changes.
 */
export function subscribeToAuth(callback: (user: WalletUser | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        let username = null;
        if (db) {
          try {
            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            username = userSnap.exists() ? userSnap.data().username : null;
          } catch (e) {
            console.error("Error fetching username from Firestore:", e);
          }
        }
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          username
        });
      } else {
        callback(null);
      }
    });
  } else {
    // Local mock auth doesn't have live event sockets, we return a blank cleanup
    return () => {};
  }
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
