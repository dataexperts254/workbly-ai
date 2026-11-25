import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  roleSlug: 'member' | 'admin' | 'finance_admin' | 'owner' | string;
  status: string;
  membershipTier: 'free' | 'verified' | 'pro' | 'top_rated' | string;
  subscriptionExpiresAt: string | null;
  completedApprovedJobs: number;
  achievement50Jobs: boolean;
  referralCode?: string | null;
  profile?: {
    phone?: string | null;
    country?: string;
    county?: string | null;
    timezone?: string;
    bio?: string | null;
    skillsJson?: string[];
    preferredPayoutPhone?: string | null;
  } | null;
}

interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  pendingReferralCode: string | null;
  setPendingReferralCode: (code: string | null) => void;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  loginWithEmail: (email: string, password: string) => Promise<AppUser>;
  registerWithEmail: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    county?: string;
    referralCode?: string;
  }) => Promise<AppUser>;
  loginWithGoogle: (referralCode?: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned an unexpected response (${resp.status}). Ensure backend API routes and database environment variables are configured.`
    );
  }
}

function mapFirebaseError(err: any): Error {
  const code = err?.code || '';
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return new Error(
      `Google Sign-In is not authorized for "${host}". Add this domain in Firebase Console -> Authentication -> Settings -> Authorized domains (or use your own Firebase project env vars on Vercel), or sign in with Email & Password.`
    );
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new Error('Google sign-in popup was closed before completing.');
  }
  if (code === 'auth/network-request-failed') {
    return new Error('Network error while contacting Google Authentication. Please try again.');
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return new Error('An account with this email already exists using a different sign-in method.');
  }
  return err instanceof Error ? err : new Error('Authentication failed. Please try again.');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const fbUserRef = useRef<FirebaseUser | null>(null);
  const pendingRefCodeRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<{ uid: string; promise: Promise<AppUser> } | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    pendingRefCodeRef.current = pendingReferralCode;
  }, [pendingReferralCode]);

  // Capture ?ref=CODE from URL on initial visit and record click
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) {
      const clean = ref.trim().toUpperCase();
      pendingRefCodeRef.current = clean;
      setPendingReferralCode(clean);
      fetch('/api/public/referrals/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      }).catch(() => {});
    }
  }, []);

  const syncFirebaseUser = useCallback(async (fbUser: FirebaseUser, explicitRefCode?: string): Promise<AppUser> => {
    if (syncPromiseRef.current && syncPromiseRef.current.uid === fbUser.uid) {
      return syncPromiseRef.current.promise;
    }

    const promise = (async () => {
      const idToken = await fbUser.getIdToken();
      fbUserRef.current = fbUser;
      tokenRef.current = idToken;
      setToken(idToken);

      const resp = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          referralCode: explicitRefCode || pendingRefCodeRef.current || undefined,
        }),
      });
      const data = await parseJsonSafe(resp);
      if (!resp.ok) {
        throw new Error(data.error || 'Google sign-in synchronization failed.');
      }

      const syncedUser = data.user as AppUser;
      setUser(syncedUser);
      return syncedUser;
    })();

    syncPromiseRef.current = { uid: fbUser.uid, promise };
    try {
      return await promise;
    } finally {
      if (syncPromiseRef.current?.promise === promise) {
        syncPromiseRef.current = null;
      }
    }
  }, []);

  // Listen to Firebase Auth state ONCE and complete any redirect sign-in
  useEffect(() => {
    let active = true;

    getRedirectResult(auth)
      .then((res) => {
        if (active && res?.user) {
          return syncFirebaseUser(res.user);
        }
      })
      .catch((err) => {
        console.error('Firebase redirect result error:', err);
      });

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      fbUserRef.current = fbUser;
      if (fbUser) {
        try {
          await syncFirebaseUser(fbUser);
        } catch (err) {
          console.error('Firebase state sync error:', err);
        }
      }
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [syncFirebaseUser]);

  const apiFetch = useCallback(async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    let activeToken = tokenRef.current;
    if (fbUserRef.current) {
      activeToken = await fbUserRef.current.getIdToken();
      tokenRef.current = activeToken;
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }

    const resp = await fetch(path, { ...options, headers });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      let msg = `Request failed (${resp.status})`;
      if (contentType.includes('application/json')) {
        const errData = await parseJsonSafe(resp).catch(() => ({}));
        msg = errData.error || msg;
      } else {
        const text = await resp.text().catch(() => '');
        if (text && !text.startsWith('<')) {
          msg = `${msg}: ${text.slice(0, 120)}`;
        }
      }
      throw new Error(msg);
    }
    if (contentType.includes('application/json')) {
      return (await parseJsonSafe(resp)) as T;
    }
    return (await resp.text()) as unknown as T;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenRef.current && !fbUserRef.current) return;
    try {
      const data = await apiFetch<{ user: AppUser }>('/api/auth/me');
      setUser(data.user);
    } catch {
      // ignore
    }
  }, [apiFetch]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(resp);
    if (!resp.ok) throw new Error(data.error || 'Sign in failed');
    tokenRef.current = data.token;
    setToken(data.token);
    const meResp = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const meData = meResp.ok ? await parseJsonSafe(meResp) : { user: data.user };
    setUser(meData.user);
    return meData.user as AppUser;
  }, []);

  const registerWithEmail = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      county?: string;
      referralCode?: string;
    }) => {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          referralCode: payload.referralCode || pendingRefCodeRef.current || undefined,
        }),
      });
      const data = await parseJsonSafe(resp);
      if (!resp.ok) throw new Error(data.error || 'Registration failed');
      tokenRef.current = data.token;
      setToken(data.token);
      const meResp = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const meData = meResp.ok ? await parseJsonSafe(meResp) : { user: data.user };
      setUser(meData.user);
      return meData.user as AppUser;
    },
    []
  );

  const loginWithGoogle = useCallback(
    async (referralCode?: string) => {
      try {
        const cred = await signInWithPopup(auth, googleAuthProvider);
        return await syncFirebaseUser(cred.user, referralCode);
      } catch (err: any) {
        if (err?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleAuthProvider);
          throw new Error('Popup blocked by browser; redirecting to Google Sign-In...');
        }
        throw mapFirebaseError(err);
      }
    },
    [syncFirebaseUser]
  );

  const logout = useCallback(async () => {
    tokenRef.current = null;
    fbUserRef.current = null;
    syncPromiseRef.current = null;
    setToken(null);
    setUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore if local session only
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        pendingReferralCode,
        setPendingReferralCode,
        apiFetch,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
