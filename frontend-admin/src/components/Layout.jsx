import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, Building2, Settings, LogOut, Bell, CreditCard } from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Organizations', path: '/organizations', icon: Building2 },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Features', path: '/features', icon: Settings },
  { label: 'AI Alerts', path: '/ai-alerts', icon: Bell },
];

const Layout = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={menuItems} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-medium text-foreground">Welcome back, {user?.name || 'Admin'}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-medium text-foreground">{user?.email}</p>
              <p className="text-muted-foreground">Super Administrator</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
