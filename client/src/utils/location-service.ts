import { IPLocationData, LocationData } from "@/interfaces/location-interface";

export class LocationService {
  /**
   * Get user's location using browser Geolocation API
   */
  static async getGPSLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Try to get IP-based location data for additional info
          try {
            const ipData = await this.getIPLocation();
            if (ipData) {
              locationData.ipAddress = ipData.ip || undefined;
              locationData.city = ipData.city || undefined;
              locationData.country = ipData.country_name || undefined;
            }
          } catch (error) {
            console.warn("Could not fetch IP location data:", error);
            // Continue without IP data - GPS coordinates are more important
          }

          resolve(locationData);
        },
        (error) => {
          let errorMessage = "Failed to get location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Get location based on IP address (fallback method)
   */
  static async getIPLocation(): Promise<IPLocationData> {
    try {
      // Using ipapi.co with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: IPLocationData = await response.json();

      // Validate that we got meaningful data
      if (!data.ip) {
        throw new Error("Invalid IP location data received");
      }

      return data;
    } catch (error) {
      console.error("IP location fetch error:", error);

      // Try alternative IP service as fallback
      try {
        const fallbackResponse = await fetch(
          "https://api.ipify.org?format=json"
        );
        if (fallbackResponse.ok) {
          const ipData = await fallbackResponse.json();
          return {
            ip: ipData.ip,
            city: "Unknown",
            country_name: "Unknown",
            latitude: 0,
            longitude: 0,
          };
        }
      } catch (fallbackError) {
        console.error("Fallback IP service also failed:", fallbackError);
      }

      throw new Error("Could not determine location from IP address");
    }
  }

  /**
   * Check if browser supports geolocation
   */
  static isGeolocationSupported(): boolean {
    return "geolocation" in navigator;
  }

  /**
   * Check if user has already granted location permission
   */
  static async checkPermissionStatus(): Promise<
    PermissionState | "unsupported"
  > {
    try {
      if (!navigator.permissions) {
        return "unsupported";
      }

      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state;
    } catch (error) {
      console.warn("Could not check permission status:", error);
      return "unsupported";
    }
  }
}
