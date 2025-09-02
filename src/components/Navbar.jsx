import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/Navbar.css";

export default function Navbar({ isAuthed }) {
  return (
    <header className="nav">
      <Link to={isAuthed ? "/chat" : "/login"} className="brand">
        <img src={logo} alt="Snabbsnack" className="brand-logo" />
      </Link>

      <nav className="actions">
        {!isAuthed ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <Link to="/chat">Chat</Link>
        )}
      </nav>
    </header>
  );
}