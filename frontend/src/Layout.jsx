import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./component/home";
import MediaAccess from "./component/Media/Media";
import SignUp from "./component/auth/SignUp";
import Login from "./component/auth/SignIn";
import Logout from "./component/auth/Logout";
import PrivateChat from "./component/chat/PrivateChat";
import Users from "./component/Users";

import "./App.css";

const Layout = () => {

  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsAuthenticated(!!token);
  }, [location.pathname]);   // 🔥 yahi main fix

  return (
    <div className="app-root">

      <header className="app-header">
        <div className="logo">MediaApp</div>

        <nav className="nav-bar">

          <NavLink to="/home" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Home
          </NavLink>

          <NavLink to="/media" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Media
          </NavLink>

          <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Users
          </NavLink>

          {!isAuthenticated && (
            <>
              <NavLink to="/signup" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                SignUp
              </NavLink>

              <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Login
              </NavLink>
            </>
          )}

          {isAuthenticated && (
            <NavLink to="/logout" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Logout
            </NavLink>
          )}

        </nav>
      </header>

      <main className="app-container">
        <Routes>

          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route path="/home" element={<Home />} />
          <Route path="/media" element={<MediaAccess />} />
          <Route path="/users" element={<Users />} />
          <Route path="/chat/:userId" element={<PrivateChat />} />

          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          <Route path="*" element={<Navigate to="/home" replace />} />

        </Routes>
      </main>

    </div>
  );
};

export default Layout;