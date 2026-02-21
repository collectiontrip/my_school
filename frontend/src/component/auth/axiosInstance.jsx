// axiosInstance.js
import axios from "axios";

const BASE_URL = "https://192.168.137.1:8000";

const AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosInstance.interceptors.request.use(
  (config) => {

    const isSignup =
      config.url?.startsWith("/auth/users/") &&
      config.method === "post";

    const isLogin =
      config.url?.startsWith("/auth/jwt/create/");

    // sirf signup + login par token nahi bhejna
    if (!isSignup && !isLogin) {

      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `JWT ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------
// Auth helper (login)
// -------------------------------
export const loginUser = async (username, password) => {
  const res = await AxiosInstance.post("/auth/jwt/create/", {
    username: username.trim(),
    password: password.trim(),
  });

  return res.data;
};

export default AxiosInstance;