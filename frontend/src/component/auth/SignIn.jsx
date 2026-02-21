import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance, {loginUser} from "./axiosInstance";
import { getUserId } from "../../services/authService";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Trim username/password & use AxiosInstance
      const res = await AxiosInstance.post("/auth/jwt/create/", {
        username: username.trim(),
        password: password.trim(),
      });

      const { access, refresh } = res.data;

      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Get user id from token (or another service)
      const userId = getUserId();
      localStorage.setItem("user_id", userId);

      console.log("Logged in user id:", userId);
      alert("Login successful");
      navigate("/home"); 

    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400) {
        setError("Invalid username or password");
      } else {
        setError("Server not reachable");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Sign In</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label className="login-label">Username</label>
          <input
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label">Password</label>
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default Login;
