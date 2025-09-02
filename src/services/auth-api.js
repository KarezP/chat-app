const BASE_URL = "/api";

export async function getCSRF() {
  const res = await fetch(`${BASE_URL}/csrf`, {
    method: "PATCH",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  const token = data?.csrfToken || data?.csrf || data?.token;
  if (!token) throw new Error("Kunde inte hämta CSRF-token");
  return token;
}

export async function register(username, password, email, avatar, csrfToken) {
  const r = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ username, password, email, avatar, csrfToken }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.message || "Registrering misslyckades");
  }
  return r.json().catch(() => ({}));
}

export async function login(username, password, csrfToken) {
  const r = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ username, password, csrfToken }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.message || "Inloggning misslyckades");
  }
  return r.json();
}
