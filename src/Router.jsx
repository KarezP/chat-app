// Router.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Navbar from "./components/Navbar";

function isAuthedNow() {
  return !!(localStorage.getItem("token") || sessionStorage.getItem("token"));
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isChat = pathname === "/chat";
  const isAuthed = isAuthedNow(); // ← läs direkt, inget React-state

  return (
    <>
      {!isChat && <Navbar isAuthed={isAuthed} />}
      <Routes>
        {!isAuthed ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default function Router() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
