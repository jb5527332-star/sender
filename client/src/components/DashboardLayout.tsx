"use client";

import React, { useState, ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Home,
  Mail,
  Send,
  Server,
  Users,
  LogOut,
  User,
  ChevronDown,
  Globe,
  FileText,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home, adminOnly: true },
  { name: "Compose Email", href: "/compose", icon: Mail },
  { name: "Sent Emails", href: "/emails", icon: Send, adminOnly: true },
  { name: "SMTP Servers", href: "/admin/smtp", icon: Server, adminOnly: true },
  { name: "Warmup Test", href: "/admin/warmup", icon: Zap, adminOnly: true },
  { name: "Users", href: "/admin/users", icon: Users, adminOnly: true },
  {
    name: "User Locations",
    href: "/admin/location",
    icon: Globe,
    adminOnly: true,
  },
  { name: "Formatter", href: "/formatter", icon: FileText },
  // { name: "Analytics", href: "/analytics", icon: BarChart3 },
  // { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isAdmin, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="login-brand-mark w-8 h-8 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold login-brand-title">
              EmailHub
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-2">
            <div className="login-brand-mark w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || ""}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.name || ""}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.email || ""}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "ml-[264px]" : "ml-0"
        }`}
      >
        {/* Header */}
        <header className="dashboard-topbar sticky top-0 z-30 h-[4.5rem] backdrop-blur-xl border-b">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={sidebarOpen}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-300"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-200"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {user?.name || "Account"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-content">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
