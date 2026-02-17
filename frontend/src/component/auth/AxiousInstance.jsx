// AxiousInstance.js
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
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Named export
export const loginUser = async (username, password) => {
  try {
    const res = await AxiosInstance.post("/auth/jwt/create/", {
      username: username.trim(),
      password: password.trim(),
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export default AxiosInstance;