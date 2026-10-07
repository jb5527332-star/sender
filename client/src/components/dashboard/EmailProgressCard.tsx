"use client";

import React, { useState, useEffect } from "react";
import { Mail, Clock, TrendingUp, AlertCircle } from "lucide-react";

interface EmailProgress {
  emailsSentToday: number;
  dailyEmailLimit: number;
  remainingEmails: number;
  progressPercentage: number;
  canSendMore: boolean;
  resetTime: string;
}

export default function EmailProgressCard() {
  const [progress, setProgress] = useState<EmailProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyProgress();
  }, []);

  const fetchDailyProgress = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/progress/daily`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch daily progress");
      }

      const data = await response.json();
      setProgress(data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load progress data");
      console.error("Error fetching daily progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    if (percentage >= 50) return "text-blue-600";
    return "text-green-600";
  };

  const formatResetTime = (resetTime: string) => {
    const reset = new Date(resetTime);
    const now = new Date();
    const diffHours = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours <= 1) return "in less than 1 hour";
    if (diffHours <= 24) return `in ${diffHours} hours`;
    return "tomorrow";
  };

  if (loading) {
    return (
      <div className="dashboard-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="dashboard-card p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error || "Unable to load progress data"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Email Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track your daily sending limit
            </p>
          </div>
        </div>
        {!progress.canSendMore && (
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Limit reached</span>
          </div>
        )}
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {progress.emailsSentToday}
          </div>
          <div className="text-sm text-gray-600">
            Sent Today
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {progress.remainingEmails}
          </div>
          <div className="text-sm text-gray-600">
            Remaining
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress
          </span>
          <span className={`text-sm font-medium ${getProgressTextColor(progress.progressPercentage)}`}>
            {progress.progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressColor(progress.progressPercentage)}`}
            style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{progress.dailyEmailLimit} limit</span>
        </div>
      </div>

      {/* Reset Information */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        <span>
          Resets {formatResetTime(progress.resetTime)}
        </span>
      </div>

      {/* Status Message */}
      {progress.progressPercentage >= 90 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              You&apos;re approaching your daily limit
            </span>
          </div>
        </div>
      )}

      {progress.progressPercentage >= 75 && progress.progressPercentage < 90 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">
              You&apos;ve used most of your daily limit
            </span>
          </div>
        </div>
      )}
    </div>
  );
}