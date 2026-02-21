import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "./axiosInstance";
import "./SignUp.css";

const SignUp = () => {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      // ⚠️ IMPORTANT
      // signup request me token nahi bhejna chahiye
      await AxiosInstance.post("/auth/users/", form, {
        headers: {
          Authorization: undefined
        }
      });

      // ✅ signup ke baad direct home
      navigate("/");
      alert("Account created successfully");

    } catch (err) {

      if (err.response?.data) {

        // better readable error
        setError(
          typeof err.response.data === "string"
            ? err.response.data
            : JSON.stringify(err.response.data)
        );

      } else {
        setError("Something went wrong");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup">

      <h2 className="signup-title">Signup</h2>

      <form className="signup-form" onSubmit={handleSubmit}>

        <input
          className="signup-input"
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />

        <input
          className="signup-input"
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          className="signup-input"
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <input
          className="signup-input"
          type="text"
          name="first_name"
          placeholder="First name"
          value={form.first_name}
          onChange={handleChange}
          required
        />

        <input
          className="signup-input"
          type="text"
          name="last_name"
          placeholder="Last name"
          value={form.last_name}
          onChange={handleChange}
          required
        />

        <button
          className="signup-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

      </form>

      {error && <p className="signup-error">{error}</p>}

    </div>
  );
};

export default SignUp;
