import { useState } from "react";
import { getCSRF, register as apiRegister } from "../services/auth-api";
import "../styles/Register.css";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    avatar: "https://i.pravatar.cc/150",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const canSubmit =
    form.username.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 4;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const csrf = await getCSRF();
      await apiRegister(
        form.username.trim(),
        form.password,
        form.email.trim(),
        form.avatar,
        csrf
      );
      setMsg({ type: "success", text: "Registreringen lyckades. Går till inloggning…" });
      setTimeout(() => (window.location.href = "/login"), 1200);
    } catch (err) {
      const text =
        err?.message || err?.response?.data?.message || "Något gick fel. Försök igen.";
      setMsg({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1>Registrera</h1>

      {msg.text && <p className={msg.type}>{msg.text}</p>}

      <form className="auth-form" onSubmit={handleSubmit}>
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
          E-post
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            autoComplete="email"
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
            autoComplete="new-password"
            minLength={4}
            required
          />
        </label>

        <button type="submit" disabled={!canSubmit || loading}>
          {loading ? "Skickar…" : "Skapa konto"}
        </button>
      </form>

      <p className="auth-hint">
        Har du konto? <a href="/login">Logga in</a>
      </p>
    </div>
  );
}
