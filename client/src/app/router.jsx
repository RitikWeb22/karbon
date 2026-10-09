import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthPage } from '../pages/AuthPage';
import { BoardPage } from '../pages/BoardPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { ActivityPage } from '../pages/ActivityPage';
import { MembersPage } from '../pages/MembersPage';
import { BillingPage } from '../pages/BillingPage';
import { useAuthStore } from '../store/useAuthStore';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/board" replace />,
      },
      {
        path: 'board',
        element: <BoardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'activity',
        element: <ActivityPage />,
      },
      {
        path: 'members',
        element: <MembersPage />,
      },
      {
        path: 'billing',
        element: <BillingPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/board" replace />,
  },
]);
