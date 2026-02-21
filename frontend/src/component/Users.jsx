import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "./auth/axiosInstance";
import "./Users.css";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const myId = Number(localStorage.getItem("user_id"));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await AxiosInstance.get("/auth/users/");

        // Djoser pagination support
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];

        setUsers(list);
      } catch (err) {
        console.error("Users fetch error", err);

        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
        } else if (err.response?.status === 403) {
          setError("You are not allowed to view users.");
        } else {
          setError("Failed to load users.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <p className="loading-text">Loading users...</p>;
  }

  if (error) {
    return (
      <div className="users-page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <h2 className="users-title">Users</h2>

      <div className="users-list">
        {users
          .filter((user) => user?.id !== myId)
          .map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <div className="username">{user.username}</div>
                <div className="email">{user.email}</div>
              </div>

              <button
                className="chat-btn"
                onClick={() => navigate(`/chat/${user.id}`)}
              >
                Chat
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UsersList;