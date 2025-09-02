import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCSRF, login as apiLogin } from "../services/auth-api";
import "../styles/Login.css";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const hasAuth = !!(localStorage.getItem("token") || sessionStorage.getItem("token"));
    if (hasAuth) navigate("/chat", { replace: true });
  }, [navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const csrf = await getCSRF();
      const data = await apiLogin(form.username.trim(), form.password, csrf);

      const jwt = data.token || data.accessToken || data.jwt || data.authToken || "";
      if (!jwt) {
        setError("Inget token returnerades från servern.");
        return;
      }

      localStorage.setItem("token", jwt);
      localStorage.setItem("username", (data.user?.username || form.username).trim());
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.id != null) localStorage.setItem("userId", String(data.user.id));

      localStorage.removeItem("botMsgs_v1");
      localStorage.removeItem("messages");

      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err?.message || "Nätverksfel eller CSRF-problem. Försök igen.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Logga in</h1>

        {error ? <div className="login-error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Användarnamn
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Lösenord
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>

        <div className="register-hint">
          Har du inget konto?{" "}
          <Link className="register-link" to="/register">Skapa konto</Link>
        </div>
      </div>
    </div>
  );
}
