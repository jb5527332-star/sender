"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/auth-context";

interface Email {
  _id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  messagePreview?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    emailsSentToday: number;
    dailyEmailLimit: number;
  };
}

export default function SentEmailsPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      // Use different endpoint based on role
      const endpoint = isAdmin ? "/emails" : "/emails/my";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setEmails(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalEmails(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, isAdmin, toast]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleViewDetails = (email: Email) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
  };

  const handleRetry = async (emailId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${emailId}/retry`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email queued for retry",
          variant: "success",
        });
        fetchEmails();
      }
    } catch (err) {
      console.error("Retry failed:", err);
      toast({
        title: "Error",
        description: "Failed to retry email",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return {
          class: "bg-green-100 text-green-800",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case "failed":
        return {
          class: "bg-red-100 text-red-800",
          icon: <XCircle className="w-3 h-3" />,
        };
      case "queued":
        return {
          class: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="w-3 h-3" />,
        };
      case "sending":
        return {
          class: "bg-blue-100 text-blue-800",
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        };
      default:
        return {
          class: "bg-gray-100 text-gray-800",
          icon: <AlertCircle className="w-3 h-3" />,
        };
    }
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.toEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.userId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? "All Emails" : "My Emails"}
            </h1>
            <p className="text-gray-600 mt-1">
              {totalEmails} total emails
            </p>
          </div>
          <button
            onClick={fetchEmails}
            className="btn-outline"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="dashboard-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select w-full sm:w-40"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
              <option value="sending">Sending</option>
            </select>

            {/* Export Button */}
            <button className="btn-outline hidden sm:flex">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Email Cards - Mobile View */}
        <div className="block lg:hidden space-y-3">
          {loading ? (
            <div className="dashboard-card p-8 flex items-center justify-center">
              <div className="spinner w-8 h-8"></div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="dashboard-card p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No emails found</p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const statusBadge = getStatusBadge(email.status);
              return (
                <div
                  key={email._id}
                  className="dashboard-card p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewDetails(email)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {email.subject}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        To: {email.toEmail}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}
                    >
                      {statusBadge.icon}
                      {email.status}
                    </span>
                  </div>

                  {isAdmin && email.userId && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {email.userId.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {email.userId.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {email.userId.emailsSentToday}/{email.userId.dailyEmailLimit} today
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(email.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(email.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table - Desktop View */}
        <div className="hidden lg:block dashboard-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="spinner w-12 h-12"></div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No emails found
              </h3>
              <p className="text-gray-500">
                {searchTerm ? "Try adjusting your search" : "No emails to display"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmails.map((email) => {
                    const statusBadge = getStatusBadge(email.status);
                    return (
                      <tr
                        key={email._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* User Column (Admin Only) */}
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {email.userId ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-semibold text-white">
                                    {email.userId.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                    {email.userId.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                    {email.userId.email}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Unknown</span>
                            )}
                          </td>
                        )}

                        {/* Email Details */}
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                              {email.subject}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-500 truncate max-w-[280px]">
                                {email.toEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}
                          >
                            {statusBadge.icon}
                            {email.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(email.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(email.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        {/* Usage (Admin Only) */}
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {email.userId ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-blue-600">
                                      {email.userId.emailsSentToday}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      / {email.userId.dailyEmailLimit}
                                    </span>
                                  </div>
                                  <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{
                                        width: `${Math.min(
                                          (email.userId.emailsSentToday /
                                            email.userId.dailyEmailLimit) *
                                            100,
                                          100
                                        )}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        )}

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(email)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            {email.status === "failed" && (
                              <button
                                onClick={() => handleRetry(email._id)}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                title="Retry"
                              >
                                <RefreshCw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredEmails.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedEmail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Email Details
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-gray-500">×</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
                <div className="space-y-4">
                  {/* User Info (Admin Only) */}
                  {isAdmin && selectedEmail.userId && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {selectedEmail.userId.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {selectedEmail.userId.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedEmail.userId.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                        <span className="text-sm text-gray-600">
                          Daily Usage:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-600">
                            {selectedEmail.userId.emailsSentToday}
                          </span>
                          <span className="text-sm text-gray-500">
                            / {selectedEmail.userId.dailyEmailLimit}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Info */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Recipient
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedEmail.toEmail}
                      </p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Subject
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedEmail.subject}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            getStatusBadge(selectedEmail.status).class
                          }`}
                        >
                          {getStatusBadge(selectedEmail.status).icon}
                          {selectedEmail.status}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                          Created
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {selectedEmail.sentAt && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                          Sent At
                        </p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedEmail.sentAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedEmail.messagePreview && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">
                          Message Preview
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {selectedEmail.messagePreview}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-outline"
                >
                  Close
                </button>
                {selectedEmail.status === "failed" && (
                  <button
                    onClick={() => {
                      handleRetry(selectedEmail._id);
                      setShowDetailModal(false);
                    }}
                    className="btn-primary bg-orange-600 hover:bg-orange-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Email
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}