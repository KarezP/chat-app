import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCSRF, login as apiLogin } from "../services/auth-api";
import "../styles/Login.css";

const BOT_STORE_PREFIX = "botMsgs_v1";

function simpleHash(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
function tryParseJwtPayload(jwt) {
  try {
    const [, payload] = String(jwt).split(".");
    if (!payload) return {};
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}
function getStableUserKey({ token, user }) {
  const uId =
    user?.id ??
    user?.userId ??
    user?._id ??
    user?.user?.id ??
    user?.user?.userId ??
    user?.user?._id;
  if (uId != null) return `uid:${String(uId)}`;

  const p = tryParseJwtPayload(token);
  const claim = p.sub || p.userId || p.id || p.email || p.username;
  if (claim) return `claim:${String(claim)}`;

  return `tok:${simpleHash(String(token || ""))}`;
}
function getBotKey(token, user) {
  return `${BOT_STORE_PREFIX}:${getStableUserKey({ token, user })}`;
}

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const hasAuth = !!(sessionStorage.getItem("token") || sessionStorage.getItem("token"));
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

      sessionStorage.setItem("token", jwt);
      sessionStorage.setItem("username", (data.user?.username || form.username).trim());
      if (data.user) sessionStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.id != null) sessionStorage.setItem("userId", String(data.user.id));

      const oldGlobal = sessionStorage.getItem(BOT_STORE_PREFIX);
      if (oldGlobal) {
        const perUserKey = getBotKey(jwt, data.user);
  
        if (!sessionStorage.getItem(perUserKey)) {
          sessionStorage.setItem(perUserKey, oldGlobal);
        }
        sessionStorage.removeItem(BOT_STORE_PREFIX);
      }

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
