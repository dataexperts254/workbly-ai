import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const fbUserRef = useRef<FirebaseUser | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Capture ?ref=CODE from URL on initial visit and record click
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) {
      const clean = ref.trim().toUpperCase();
      setPendingReferralCode(clean);
      fetch('/api/public/referrals/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      }).catch(() => {});
    }
  }, []);

  // Listen to Firebase Auth state for seamless Google Sign-In persistence
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      fbUserRef.current = fbUser;
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          tokenRef.current = idToken;
          setToken(idToken);
          const resp = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ referralCode: pendingReferralCode || undefined }),
          });
          if (resp.ok) {
            const data = await resp.json();
            // Load full /me details including referralCode & profile
            const meResp = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (meResp.ok) {
              const meData = await meResp.json();
              setUser(meData.user);
            } else {
              setUser(data.user);
            }
          }
        } catch (err) {
          console.error('Firebase state sync error:', err);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [pendingReferralCode]);

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
        const errData = await resp.json().catch(() => ({}));
        msg = errData.error || msg;
      }
      throw new Error(msg);
    }
    if (contentType.includes('application/json')) {
      return (await resp.json()) as T;
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
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Sign in failed');
    tokenRef.current = data.token;
    setToken(data.token);
    const meResp = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const meData = meResp.ok ? await meResp.json() : { user: data.user };
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
          referralCode: payload.referralCode || pendingReferralCode || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Registration failed');
      tokenRef.current = data.token;
      setToken(data.token);
      const meResp = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const meData = meResp.ok ? await meResp.json() : { user: data.user };
      setUser(meData.user);
      return meData.user as AppUser;
    },
    [pendingReferralCode]
  );

  const loginWithGoogle = useCallback(
    async (referralCode?: string) => {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      fbUserRef.current = cred.user;
      const idToken = await cred.user.getIdToken();
      tokenRef.current = idToken;
      setToken(idToken);
      const resp = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          referralCode: referralCode || pendingReferralCode || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Google sign-in sync failed');
      const meResp = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const meData = meResp.ok ? await meResp.json() : { user: data.user };
      setUser(meData.user);
      return meData.user as AppUser;
    },
    [pendingReferralCode]
  );

  const logout = useCallback(async () => {
    tokenRef.current = null;
    fbUserRef.current = null;
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
