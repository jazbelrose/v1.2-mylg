import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/contexts/useAuth';
import { useDashboardPreview } from '@/shared/utils/dashboardPreview';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading, authStatus } = useAuth();
  const location = useLocation();
  const previewEnabled = useDashboardPreview(location.search);

  if (previewEnabled) {
    return children;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }

  if (authStatus !== 'signedIn' && authStatus !== 'incompleteProfile') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

