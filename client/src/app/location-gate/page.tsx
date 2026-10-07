"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import LocationPermissionModal from "@/components/LocationPermissionModal";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export default function LocationGatePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enableLocation =
    (process.env.NEXT_PUBLIC_ENABLE_LOCATION_VERIFICATION || "false") ===
    "true";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // If location verification is disabled, skip gate
  useEffect(() => {
    if (!authLoading && isAuthenticated && !enableLocation) {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, enableLocation, router]);

  // Check if user has already granted location permission
  useEffect(() => {
    if (user?.location?.hasGrantedPermission) {
      // User already granted permission, redirect to dashboard
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLocationGranted = async (locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    ipAddress?: string;
    city?: string;
    country?: string;
  }) => {
    setIsSaving(true);
    setError(null);

    try {
      // Save location to backend
      const response = await apiClient.saveLocation(locationData);

      if (response.success) {
        // Successfully saved, redirect to dashboard
        router.push("/dashboard");
      } else {
        throw new Error(response.message || "Failed to save location");
      }
    } catch (err) {
      console.error("Save location error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to save location. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationDenied = () => {
    setError(
      "Location access is required to use this application. Please enable location permissions in your browser settings and refresh the page."
    );
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Show modal overlay */}
      {enableLocation && (
        <LocationPermissionModal
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
        />
      )}

      {/* Background content (blocked by modal) */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {enableLocation ? "Setting up your account..." : "Redirecting..."}
          </h1>
          {enableLocation && (
            <p className="text-gray-600 dark:text-gray-400">
              Please grant location access to continue
            </p>
          )}
        </div>
      </div>

      {/* Show saving state */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-white mx-auto mb-4" />
            <p className="text-white text-xl font-semibold">
              Saving your location...
            </p>
          </div>
        </div>
      )}

      {/* Persistent Error (if location denied) */}
      {error && error.includes("required") && (
        <div className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-red-600 text-white rounded-lg shadow-lg text-center">
          <p className="font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}