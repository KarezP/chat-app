// Router.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Navbar from "./components/Navbar";

function AppRoutes({ isAuthed }) {
  const { pathname } = useLocation();
  const isChat = pathname === "/chat";

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
  // 🔑 Läs auth-status direkt vid varje render (ingen state/lyssnare behövs)
  const isAuthed = !!localStorage.getItem("token");

  return (
    <BrowserRouter>
      <AppRoutes isAuthed={isAuthed} />
    </BrowserRouter>
  );
}
