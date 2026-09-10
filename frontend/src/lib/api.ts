import axios from "axios";

// Single source of truth for the backend base URL.
// Set NEXT_PUBLIC_API_URL in frontend/.env.local for local dev
// and in your deployment environment for production.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 s — AI endpoints can be slow on first model load
});

// Automatically attach Bearer token from localStorage on every request.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("foundit_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global 401 handler — clear storage, display session alert, and redirect to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("foundit_token");
      localStorage.removeItem("foundit_user");
      
      // Store session alert message for display on login page
      sessionStorage.setItem("foundit_auth_message", "Your session expired — please log back in.");
      
      // Avoid infinite redirect loop if already on login or register page
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
