import { apiClient } from "./api-client";

export interface UserLocation {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  location?: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    timestamp: string | null;
    ipAddress: string | null;
    city: string | null;
    country: string | null;
    hasGrantedPermission: boolean;
  };
}

export interface UserLocationsResponse {
  success: boolean;
  data: UserLocation[];
  message?: string;
}

export const userLocationAPI = {
  async getAllUserLocations(): Promise<UserLocation[]> {
    try {
      const response = await fetch(`${apiClient.baseURL}/users/locations/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...apiClient.getAuthHeader(),
        },
      });

      const result: UserLocationsResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch user locations");
      }

      return result.data || [];
    } catch (error) {
      console.error("Error fetching user locations:", error);
      throw error;
    }
  },

  getLocationStats(users: UserLocation[]) {
    const usersWithLocation = users.filter(
      (u) =>
        u.location?.hasGrantedPermission &&
        u.location?.latitude &&
        u.location?.longitude
    );

    const countries = new Set(
      usersWithLocation.map((u) => u.location?.country).filter((c) => c)
    );

    const cities = new Set(
      usersWithLocation.map((u) => u.location?.city).filter((c) => c)
    );

    return {
      totalUsers: users.length,
      usersWithLocation: usersWithLocation.length,
      uniqueCountries: countries.size,
      uniqueCities: cities.size,
      countriesList: Array.from(countries),
      citiesList: Array.from(cities),
    };
  },
};
