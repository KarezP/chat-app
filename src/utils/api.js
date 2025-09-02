import { getCSRF } from "../services/auth-api";

const BASE = "/api";

export async function getMessages(token) {
  const res = await fetch(`${BASE}/messages`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Kunde inte hämta meddelanden");
  return res.json();
}

export async function sendMessage(token, text) {
  const csrfToken = await getCSRF();
  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ text, csrfToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Kunde inte skicka meddelandet");
  }
  return res.json();
}

export async function deleteMessage(token, messageId) {
  const csrfToken = await getCSRF();
  const res = await fetch(`${BASE}/messages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ csrfToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Kunde inte ta bort meddelandet");
  }
  return res.json();
}
