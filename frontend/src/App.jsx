import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";

import Home from "./component/home";
import MediaAccess from "./component/Media/Media";
import Login from "./component/auth/SignIn";
import PrivateChat from "./component/chat/PrivateChat";
import Users from "./component/Users";

import CallPanel from "./component/call/CallPanel";   // ✅ ADD

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">

        

        <header className="app-header">
          <div className="logo">MediaApp</div>

          <nav className="nav-bar">

            <NavLink
              to="/home"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/media"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Media
            </NavLink>

            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Users
            </NavLink>

            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Login
            </NavLink>

          </nav>
        </header>

        <main className="app-container">
          <Routes>

            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<Home />} />
            <Route path="/media" element={<MediaAccess />} />

            <Route path="/users" element={<Users />} />

            <Route path="/chat/:userId" element={<PrivateChat />} />

            <Route path="/login" element={<Login />} />

            <Route path="*" element={<Navigate to="/home" replace />} />

          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;
