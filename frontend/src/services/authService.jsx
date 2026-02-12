import axios from "axios";
import { jwtDecode } from "jwt-decode";

const getUserId = () => {
  const token = localStorage.getItem("accessToken");

  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.user_id;
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
};

const getAccessToken = () => {
  return localStorage.getItem("accessToken");
};

const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      "http://localhost:8000/api/token/refresh/",
      {
        refresh: refreshToken,
      }
    );

    // ✅ only access token is returned by SimpleJWT
    localStorage.setItem("accessToken", response.data.access);

    return response.data.access;
  } catch (error) {
    console.error("Failed to refresh access token", error);
    return null;
  }
};

export {
  getUserId,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
};
