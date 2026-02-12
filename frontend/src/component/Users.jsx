import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "./auth/AxiousInstance";
import "./Users.css";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const myId = Number(localStorage.getItem("user_id"));

  useEffect(() => {
    AxiosInstance.get("/auth/users/")
      .then(res => setUsers(res.data))
      .catch(err => console.error("Users fetch error", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Loading users...</p>;

  return (
    <div className="users-page">
      <h2 className="users-title">Users</h2>
      <div className="users-list">
        {users
          .filter(user => user.id !== myId)
          .map(user => (
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
