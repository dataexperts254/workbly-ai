import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicSite } from './pages/PublicSite';
import { MemberPortal } from './pages/MemberPortal';
import { AdminPortal } from './pages/AdminPortal';
import { OwnerDashboard } from './pages/OwnerDashboard';

function RouterShell() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
      setRoute(path.split('?')[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center text-sm text-slate-600">
        Loading Workaby AI...
      </div>
    );
  }

  if (route.startsWith('/owner')) {
    if (!user) return <PublicSite route="/login" navigate={navigate} />;
    if (user.roleSlug !== 'owner' && user.roleSlug !== 'finance_admin') {
      return <OwnerDashboard navigate={navigate} />; // Server returns 403 and OwnerDashboard renders clean access restricted view
    }
    return <OwnerDashboard navigate={navigate} />;
  }

  if (route.startsWith('/admin')) {
    if (!user) return <PublicSite route="/login" navigate={navigate} />;
    if (!['admin', 'finance_admin', 'owner'].includes(user.roleSlug)) {
      return <MemberPortal route="/portal" navigate={navigate} />;
    }
    return <AdminPortal route={route} navigate={navigate} />;
  }

  if (route.startsWith('/portal')) {
    if (!user) return <PublicSite route="/login" navigate={navigate} />;
    return <MemberPortal route={route} navigate={navigate} />;
  }

  return <PublicSite route={route} navigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterShell />
    </AuthProvider>
  );
}
