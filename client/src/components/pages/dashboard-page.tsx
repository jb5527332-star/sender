"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Mail, Send } from "lucide-react";
import EmailProgressCard from "@/components/dashboard/EmailProgressCard";


interface RecentEmail {
  _id: string;
  toEmail: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      // Fetch recent emails
      const emailsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/my?limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const emailsData = await emailsRes.json();
      setRecentEmails(emailsData.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "badge-success";
      case "failed":
        return "badge-error";
      case "queued":
        return "badge-warning";
      default:
        return "badge-info";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="dashboard-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold ">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here&apos;s what&apos;s happening with your emails today
            </p>
          </div>
          <a href="/compose" className="btn-primary">
            <Send className="w-5 h-5" />
            Compose Email
          </a>
        </div>
      </div>

      {/* Email Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="lg:col-span-1">
          <EmailProgressCard />
        </div>
      </div>

      {/* Two Column Layout */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Recent Emails */}
          <div className="lg:col-span-2 dashboard-card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Recent Emails</h2>
            </div>
            <div className="p-6">
              {recentEmails.length === 0 ? (
                <div className="empty-state py-8">
                  <Mail className="empty-state-icon" />
                  <h3 className="empty-state-title">No emails yet</h3>
                  <p className="empty-state-description">
                    Start by composing your first email
                  </p>
                  <a href="/compose" className="btn-primary mt-4">
                    Compose Email
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEmails.map((email) => (
                    <div
                      key={email._id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-black truncate">
                            {email.subject}
                          </p>
                          <span
                            className={`badge ${getStatusColor(email.status)}`}
                          >
                            {email.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          To: {email.toEmail}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 ml-4">
                        {new Date(email.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  <a
                    href="/emails"
                    className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
                  >
                    View all emails →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
