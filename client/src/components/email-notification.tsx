"use client";

import React, { useEffect, useState } from "react";

import { EmailNotificationProps } from "@/interfaces/components-interface";

export default function EmailNotification({
  show,
  onClose,
  emailDetails,
}: EmailNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      // Play notification sound
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio playback error:", e));
    } else {
      setIsAnimating(false);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed top-0 right-0 z-50 p-4 max-w-md">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
          isAnimating ? "animate-slide-up" : ""
        }`}
      >
        <div className="p-4 flex items-start">
          <div className="mr-4 flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600 dark:text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">Message Sent</span>
                <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 rounded-full">
                  <svg
                    className="w-2 h-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Your email &quot;{emailDetails.subject}&quot; was successfully
              sent to {emailDetails.recipient}.
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <svg
                className="mr-1 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
