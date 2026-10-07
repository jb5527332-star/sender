"use client";

import React, { useState } from "react";
import { MapPin, Shield, TrendingUp, Lock, Loader2 } from "lucide-react";

interface LocationPermissionModalProps {
  onLocationGranted: (locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    ipAddress?: string;
    city?: string;
    country?: string;
  }) => Promise<void>;
  onLocationDenied: () => void;
}

export default function LocationPermissionModal({
  onLocationGranted,
  onLocationDenied,
}: LocationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Import dynamically to avoid SSR issues
      const { LocationService } = await import("@/utils/location-service");

      // Check if geolocation is supported
      if (!LocationService.isGeolocationSupported()) {
        throw new Error("Geolocation is not supported by your browser");
      }

      // Get GPS location
      const locationData = await LocationService.getGPSLocation();

      // Call the parent handler with location data
      await onLocationGranted(locationData);
    } catch (err) {
      console.error("Location error:", err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to get location. Please try again.";

      setError(errorMessage);

      // If it's a permission denial, call the denied handler
      if (errorMessage.includes("denied")) {
        setTimeout(() => {
          onLocationDenied();
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ pointerEvents: "all" }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 m-4">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
          Location Required
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          We need your location to provide secure access and personalized
          analytics
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Enhanced Security
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Protect your account from unauthorized access
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex-shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Personalized Experience
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get content tailored to your region
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Location-Based Features
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access features optimized for your area
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleEnableLocation}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Enable Location Access
            </>
          )}
        </button>

        {/* Privacy Note */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Your privacy is important to us</span>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Location data is encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  );
}
