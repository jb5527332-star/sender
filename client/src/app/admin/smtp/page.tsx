"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Server, Plus, Edit, Trash2, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/components/toast";
import { ISmtpResponse } from "@/interfaces/server-types";
import DashboardLayout from "@/components/DashboardLayout";

export default function SmtpManagementPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [smtps, setSmtps] = useState<ISmtpResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
    dailyLimit: 100,
    isSharedPool: true,
    availableToUsers: false,
    priority: 1,
  });

  const fetchSmtps = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/smtp?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSmtps(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching SMTPs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch SMTP servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchSmtps();
  }, [isAdmin, router, fetchSmtps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/smtp/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/smtp`;

      let submitData: Record<string, unknown> = { ...formData };
      if (editingId && !formData.password) {
        const rest = { ...submitData } as Record<string, unknown> & {
          password?: string;
        };
        delete rest.password;
        submitData = rest;
      }

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: editingId
            ? "SMTP server updated successfully"
            : "SMTP server added successfully",
          variant: "success",
        });
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchSmtps();
      } else {
        throw new Error(data.error || "Operation failed");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (smtp: ISmtpResponse) => {
    setFormData({
      name: smtp.name,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      username: smtp.username,
      password: "",
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName || "",
      dailyLimit: smtp.dailyLimit,
      isSharedPool: smtp.isSharedPool,
      availableToUsers: smtp.availableToUsers,
      priority: smtp.priority,
    });
    setEditingId(smtp._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SMTP server?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/smtp/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "SMTP server deleted successfully",
          variant: "success",
        });
        fetchSmtps();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete SMTP server",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while deleting SMTP server";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/smtp/${id}/test`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "SMTP server is working correctly",
          variant: "success",
        });
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
      dailyLimit: 100,
      isSharedPool: true,
      availableToUsers: false,
      priority: 1,
    });
  };

  const getStatusColor = (smtp: ISmtpResponse) => {
    if (!smtp.isActive) return "text-gray-400";
    if (smtp.status === "active") return "text-green-500";
    if (smtp.status === "rate_limited") return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">SMTP Servers</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your email sending servers
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                resetForm();
              }}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Add SMTP Server
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="dashboard-card p-6">
              <div className="relative z-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Servers
                </p>
                <p className="text-3xl font-bold text-black mt-1">
                  {smtps.length}
                </p>
              </div>
            </div>

            <div className="dashboard-card p-6">
              <div className="relative z-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active
                </p>
                <p className="text-3xl font-bold text-black mt-1">
                  {
                    smtps.filter((s) => s.isActive && s.status === "active")
                      .length
                  }
                </p>
              </div>
            </div>

            <div className="dashboard-card p-6">
              <div className="relative z-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Emails Today
                </p>
                <p className="text-3xl font-bold text-black mt-1">
                  {smtps.reduce((sum, s) => sum + s.emailsSentToday, 0)}
                </p>
              </div>
            </div>

            <div className="dashboard-card p-6">
              <div className="relative z-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Shared Pool
                </p>
                <p className="text-3xl font-bold text-black mt-1">
                  {smtps.filter((s) => s.isSharedPool).length}
                </p>
              </div>
            </div>
          </div>

          {/* SMTP Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white  rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {editingId ? "Edit SMTP Server" : "Add New SMTP Server"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Server Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="form-input"
                          required
                          placeholder="Gmail SMTP"
                        />
                      </div>
                      <div>
                        <label className="form-label">Host *</label>
                        <input
                          type="text"
                          value={formData.host}
                          onChange={(e) =>
                            setFormData({ ...formData, host: e.target.value })
                          }
                          className="form-input"
                          required
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Port *</label>
                        <input
                          type="number"
                          value={formData.port}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              port: parseInt(e.target.value),
                            })
                          }
                          className="form-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Security</label>
                        <select
                          value={formData.secure ? "true" : "false"}
                          onChange={(e) => {
                            const isSSL = e.target.value === "true";
                            setFormData({
                              ...formData,
                              secure: isSSL,
                              port: isSSL ? 465 : 587,
                            });
                          }}
                          className="form-select"
                        >
                          <option value="false">TLS (587)</option>
                          <option value="true">SSL (465)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Username *</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              username: e.target.value,
                            })
                          }
                          className="form-input"
                          required
                          placeholder="username or user@example.com"
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          Password{" "}
                          {editingId && "(leave blank to keep current)"}
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="form-input"
                          required={!editingId}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">From Email *</label>
                        <input
                          type="email"
                          value={formData.fromEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fromEmail: e.target.value,
                            })
                          }
                          className="form-input"
                          required
                          placeholder="noreply@example.com"
                        />
                      </div>
                      <div>
                        <label className="form-label">From Name</label>
                        <input
                          type="text"
                          value={formData.fromName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fromName: e.target.value,
                            })
                          }
                          className="form-input"
                          placeholder="Company Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="form-label">Daily Limit *</label>
                        <input
                          type="number"
                          value={formData.dailyLimit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dailyLimit: parseInt(e.target.value),
                            })
                          }
                          className="form-input"
                          required
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="form-label">Priority</label>
                        <input
                          type="number"
                          value={formData.priority}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              priority: parseInt(e.target.value),
                            })
                          }
                          className="form-input"
                          min="1"
                          max="10"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isSharedPool}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                isSharedPool: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm">Shared Pool</span>
                        </label>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.availableToUsers}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                availableToUsers: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm">Available to users</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        resetForm();
                      }}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingId ? "Update Server" : "Add Server"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SMTP List */}
          <div className="grid grid-cols-1 gap-6">
            {smtps.length === 0 ? (
              <div className="dashboard-card">
                <div className="empty-state py-12">
                  <Server className="empty-state-icon" />
                  <h3 className="empty-state-title">
                    No SMTP servers configured
                  </h3>
                  <p className="empty-state-description">
                    Add your first SMTP server to start sending emails
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary mt-4"
                  >
                    <Plus className="w-5 h-5" />
                    Add SMTP Server
                  </button>
                </div>
              </div>
            ) : (
              smtps.map((smtp) => (
                <div key={smtp._id} className="dashboard-card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            smtp
                          )}`}
                        ></div>
                        <h3 className="text-xl font-bold text-black">
                          {smtp.name}
                        </h3>
                        {smtp.isSharedPool && (
                          <span className="badge-info">Shared Pool</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Host
                          </p>
                          <p className="font-medium">
                            {smtp.host}:{smtp.port}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            From Email
                          </p>
                          <p className="font-medium">{smtp.fromEmail}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Daily Usage
                          </p>
                          <p className="font-medium">
                            {smtp.emailsSentToday} / {smtp.dailyLimit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Success Rate
                          </p>
                          <p className="font-medium text-green-600">
                            {smtp.successRate}%
                          </p>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (smtp.emailsSentToday / smtp.dailyLimit) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      {smtp.status === "rate_limited" && (
                        <div className="mt-3">
                          <span className="badge-warning">
                            Rate limit reached
                          </span>
                          {smtp.rateLimitedUntil && (
                            <p className="text-sm text-yellow-600 mt-1">
                              Until{" "}
                              {new Date(smtp.rateLimitedUntil).toLocaleString()}
                            </p>
                          )}
                          {smtp.lastError && (
                            <p className="text-sm text-gray-600 mt-1">
                              {smtp.lastError}
                            </p>
                          )}
                        </div>
                      )}
                      {((!smtp.isActive && smtp.status !== "rate_limited") ||
                        smtp.status === "failed") && (
                        <div className="mt-3">
                          <span className="badge-danger">Unavailable</span>
                          {smtp.lastError && (
                            <p className="text-sm text-red-600 mt-1">
                              {smtp.lastError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleTestConnection(smtp._id)}
                        disabled={testingId === smtp._id}
                        className="btn-outline"
                      >
                        {testingId === smtp._id ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Zap className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(smtp)}
                        className="btn-icon"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(smtp._id)}
                        className="btn-icon text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
