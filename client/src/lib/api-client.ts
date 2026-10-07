import { LocationData } from "@/interfaces/location-interface";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const apiClient = {
  baseURL: API_BASE_URL,

  getAuthHeader: (): Record<string, string> => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async fetchWithAuth(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem("refreshToken");
          const refreshController = new AbortController();
          const refreshTimeout = setTimeout(() => refreshController.abort(), 15000);
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            signal: refreshController.signal,
          }).finally(() => clearTimeout(refreshTimeout));

          const data = await refreshResponse.json();

          if (refreshResponse.ok && data.success) {
            localStorage.setItem("authToken", data.data.accessToken);
            localStorage.setItem("refreshToken", data.data.refreshToken);
            processQueue();

            // Retry original request
            headers.Authorization = `Bearer ${data.data.accessToken}`;
            const retryController = new AbortController();
            const retryTimeout = setTimeout(() => retryController.abort(), 15000);
            response = await fetch(`${API_BASE_URL}${url}`, {
              ...options,
              headers,
              signal: retryController.signal,
            }).finally(() => clearTimeout(retryTimeout));
          } else {
            processQueue(new Error("Token refresh failed"));
            window.location.href = "/login";
          }
        } catch (error) {
          processQueue(error);
          throw error;
        } finally {
          isRefreshing = false;
        }
      } else {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          headers.Authorization = `Bearer ${localStorage.getItem("authToken")}`;
          const queuedController = new AbortController();
          const queuedTimeout = setTimeout(() => queuedController.abort(), 15000);
          return fetch(`${API_BASE_URL}${url}`, { ...options, headers, signal: queuedController.signal }).finally(() => clearTimeout(queuedTimeout));
        });
      }
    }

    return response;
  },

  async saveLocation(locationData: LocationData) {
    const response = await this.fetchWithAuth("/auth/save-location", {
      method: "POST",
      body: JSON.stringify(locationData),
    });
    return response.json();
  },

  async getAvailableSmtps() {
    const response = await this.fetchWithAuth("/smtp/available", {
      method: "GET",
    });
    return response.json();
  },
  async getNextFromAddress() {
    const response = await this.fetchWithAuth("/emails/from/next", {
      method: "GET",
    });
    return response.json();
  },
};
