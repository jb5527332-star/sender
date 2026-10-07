// client/src/components/admin/UserLocationMap.tsx

"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UserLocation } from "@/lib/user-api-client";
import { MapPin, Mail, Clock, Globe, Shield, User } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string, isAdmin: boolean) => {
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26C32 7.163 24.837 0 16 0z" 
            fill="${color}" stroke="#fff" stroke-width="2"/>
      ${
        isAdmin
          ? '<circle cx="16" cy="16" r="6" fill="#fff"/><path d="M16 10l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="' +
            color +
            '"/>'
          : '<circle cx="16" cy="16" r="6" fill="#fff"/>'
      }
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker-icon",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
};

// Component to fit bounds to all markers
function MapBoundsHandler({ users }: { users: UserLocation[] }) {
  const map = useMap();

  useEffect(() => {
    const validLocations = users.filter(
      (user) =>
        user.location?.latitude &&
        user.location?.longitude &&
        user.location?.hasGrantedPermission
    );

    if (validLocations.length > 0) {
      const bounds = L.latLngBounds(
        validLocations.map((user) => [
          user.location!.latitude!,
          user.location!.longitude!,
        ])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [users, map]);

  return null;
}

interface UserLocationMapProps {
  users: UserLocation[];
}

export default function UserLocationMap({ users }: UserLocationMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Only render map on client side to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const usersWithLocation = users.filter(
    (user) =>
      user.location?.hasGrantedPermission &&
      user.location?.latitude &&
      user.location?.longitude
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isMounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (usersWithLocation.length === 0) {
    return (
      <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Location Data Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Users will appear here once they grant location permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 shadow-lg">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler users={usersWithLocation} />

        {usersWithLocation.map((user) => {
          const lat = user.location!.latitude!;
          const lng = user.location!.longitude!;
          const isAdmin = user.role === "admin";
          const markerColor = isAdmin ? "#8b5cf6" : "#3b82f6";

          return (
            <Marker
              key={user._id}
              position={[lat, lng]}
              icon={createCustomIcon(markerColor, isAdmin)}
            >
              <Popup className="custom-popup" maxWidth={300}>
                <div className="p-2 min-w-[250px]">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isAdmin ? "bg-purple-100" : "bg-blue-100"
                      }`}
                    >
                      {isAdmin ? (
                        <Shield
                          className={`w-5 h-5 ${
                            isAdmin ? "text-purple-600" : "text-blue-600"
                          }`}
                        />
                      ) : (
                        <User
                          className={`w-5 h-5 ${
                            isAdmin ? "text-purple-600" : "text-blue-600"
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    {user.location?.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {user.location.city}
                          {user.location.country &&
                            `, ${user.location.country}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>Last login: {formatDate(user.lastLoginAt)}</span>
                    </div>

                    {user.location?.ipAddress && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-mono">
                          {user.location.ipAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          user.isActive ? "bg-green-600" : "bg-red-600"
                        }`}
                      ></span>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
