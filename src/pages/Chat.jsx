import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { getMessages, sendMessage, deleteMessage } from "../utils/api";
import fakeMessages from "../messages.json";
import "../styles/Chat.css";
import SideNav from "../components/SideNav";

const BASE_URL = "https://chatify-api.up.railway.app";
const BOT_STORE_PREFIX = "botMsgs_v1";

/* ------------------------- helpers: nycklar/lagring ------------------------ */
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
function getStableUserKey({ token, currentUser }) {
  const storedId = localStorage.getItem("userId");
  if (storedId) return `uid:${storedId}`;

  const cuId =
    currentUser?.id ??
    currentUser?.userId ??
    currentUser?._id ??
    currentUser?.user?.id ??
    currentUser?.user?.userId ??
    currentUser?.user?._id;
  if (cuId != null) return `uid:${String(cuId)}`;

  const p = tryParseJwtPayload(token);
  const claim = p.sub || p.userId || p.id || p.email || p.username;
  if (claim) return `claim:${String(claim)}`;

  return `tok:${simpleHash(String(token || ""))}`;
}
function getBotKey(token, currentUser) {
  const who = getStableUserKey({ token, currentUser });
  return `${BOT_STORE_PREFIX}:${who}`;
}
function loadBotMessagesFor(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveBotMessagesFor(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

/* ------------------------------ formatering ------------------------------- */
function toLocalTime(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? String(iso)
    : new Date(t).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

/* ----------------------------- identitetslogik ---------------------------- */
function buildIdentity(currentUser, storedUsername) {
  const ids = new Set(
    [
      currentUser?.id,
      currentUser?.userId,
      currentUser?._id,
      currentUser?.uid,
      currentUser?.ID,
      currentUser?.user?.id,
      currentUser?.user?.userId,
      currentUser?.user?._id,
    ]
      .filter((x) => x != null)
      .map((x) => String(x))
  );

  const names = new Set(
    [
      currentUser?.username,
      currentUser?.user,
      currentUser?.email,
      currentUser?.user?.username,
      currentUser?.user?.email,
      storedUsername,
    ].filter(Boolean)
  );

  return { ids, names };
}
function hasNameMatch(set, s) {
  if (!s) return false;
  const x = String(s).trim().toLowerCase();
  for (const n of set) if (String(n).trim().toLowerCase() === x) return true;
  return false;
}
function isMine(msg, my, usersMap) {
  if (!msg) return false;
  const uid = String(msg.uid ?? msg.userId ?? msg.user?.id ?? "");
  if (uid && my.ids.has(uid)) return true;
  const nameOnMsg = msg.user?.username ?? msg.username ?? msg.authorName ?? "";
  if (hasNameMatch(my.names, nameOnMsg)) return true;
  const mapName = uid && usersMap ? usersMap[uid] : "";
  if (hasNameMatch(my.names, mapName)) return true;
  const storedId = localStorage.getItem("userId");
  if (storedId && uid && storedId === uid) return true;
  return false;
}

/* ----------------------------- msg-normalisering -------------------------- */
function pickUid(m) {
  const cand = [
    m?.uid,
    m?.userId,
    m?.user_id,
    m?.authorId,
    m?.senderId,
    m?.user?.id,
    m?.user?.userId,
    m?.user?._id,
  ].find((x) => x != null);
  return cand != null ? String(cand) : null;
}
function normalizeMsg(m) {
  const id = m?.id ?? m?._id ?? m?.messageId ?? m?.uuid ?? null;
  const text = m?.text ?? m?.message ?? m?.content ?? "";
  const uid = pickUid(m);

  let createdAtIso = new Date().toISOString();
  const tIn = m?.createdAt ?? m?.created_at ?? m?.updatedAt ?? m?.updated_at;
  if (tIn) {
    const t = Date.parse(tIn);
    if (!Number.isNaN(t)) createdAtIso = new Date(t).toISOString();
  }

  const user =
    m?.user && typeof m.user === "object"
      ? {
          id: m.user.id ?? m.user._id ?? m.user.userId ?? m.user.uid ?? null,
          username: m.user.username ?? m.user.name ?? m.user.userName ?? "User",
          avatar:
            m.user.avatar ??
            (m.user.username
              ? `https://i.pravatar.cc/150?u=${encodeURIComponent(
                  m.user.username
                )}`
              : ""),
        }
      : null;

  const isBot = uid === "bot" || user?.username === "bot";
  const finalUser = isBot
    ? { id: "bot", username: "bot", avatar: "https://i.pravatar.cc/150?u=bot" }
    : user;

  return { id, text, uid, createdAtIso, user: finalUser };
}
function extractIdDeep(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 3) return null;
  for (const k of ["id", "_id", "messageId", "uuid"])
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  for (const k of ["data", "message", "result"])
    if (obj[k]) {
      const found = extractIdDeep(obj[k], depth + 1);
      if (found != null) return found;
    }
  for (const v of Object.values(obj))
    if (v && typeof v === "object") {
      const found = extractIdDeep(v, depth + 1);
      if (found != null) return found;
    }
  return null;
}

/* ================================== Chat ================================== */
export default function Chat() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasAuth = !!(
      localStorage.getItem("token") || sessionStorage.getItem("token")
    );
    if (!hasAuth) navigate("/login", { replace: true });
  }, [navigate]);

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const storedName = (localStorage.getItem("username") || "").trim();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const my = useMemo(
    () => buildIdentity(currentUser, storedName),
    [currentUser, storedName]
  );

  const [usersMap, setUsersMap] = useState({});
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [text, setText] = useState("");
  const [botIndex, setBotIndex] = useState(0);
  const [err, setErr] = useState("");
  const listRef = useRef(null);

  const myUid =
    [...my.ids][0] ?? currentUser?.id ?? currentUser?.userId ?? "";
  const myDisplayName = (currentUser?.username || storedName || "Du").trim();
  const myAvatar =
    currentUser?.avatar ||
    `https://i.pravatar.cc/150?u=${encodeURIComponent(myDisplayName || "me")}`;

  const botKey = getBotKey(token, currentUser);

  useEffect(() => {
    try {
      localStorage.setItem("messages", JSON.stringify(messages));
    } catch {}
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "auto",
    });
  }, [messages]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const map = {};
        data.forEach((u) => {
          const ids = buildIdentity(u, null).ids;
          const key = [...ids][0];
          const name =
            u?.username ?? u?.user ?? u?.email ?? (key ? `#${key}` : "User");
          if (key) map[String(key)] = name;
        });
        map["bot"] = "bot";
        setUsersMap(map);
      } catch {}
    })();
  }, [token]);

  async function load() {
    if (!token) return;
    setErr("");
    try {
      const apiData = await getMessages(token);
      const real = Array.isArray(apiData)
        ? apiData
        : apiData?.messages ?? apiData?.data ?? [];
      const normalizedReal = real.map(normalizeMsg);
      const localBot = loadBotMessagesFor(botKey);
      setMessages([...normalizedReal, ...localBot]);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Kunde inte hämta meddelanden.";
      setErr(msg);
    }
  }

  useEffect(() => {
    load();
    // när botKey ändras (ny användare/token) laddar vi rätt historik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botKey]);

  async function handleSend() {
    const raw = text.trim();
    if (!raw) return;

    const cleanText = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    try {
      const created = await sendMessage(token, cleanText);
      const createdId =
        extractIdDeep(created) ?? `${Date.now()}-${Math.random()}`;

      const mine = normalizeMsg({
        ...(typeof created === "object" ? created : {}),
        id: createdId,
        text: cleanText,
        userId: myUid,
        uid: String(myUid || ""),
        user: {
          id: myUid || null,
          username: myDisplayName || "Jag",
          avatar: myAvatar,
        },
        createdAt: new Date().toISOString(),
      });

      const reply = fakeMessages[botIndex % fakeMessages.length]?.text || "🙂";
      const bot = normalizeMsg({
        id: `${Date.now()}-${Math.random()}`,
        uid: "bot",
        userId: "bot",
        user: {
          id: "bot",
          username: "bot",
          avatar: "https://i.pravatar.cc/150?u=bot",
        },
        text: reply,
        createdAt: new Date().toISOString(),
      });

      setText("");
      setMessages((prev) => [...prev, mine]);

      setTimeout(() => {
        setMessages((prev) => {
          const next = [...prev, bot];
          const stored = loadBotMessagesFor(botKey);
          saveBotMessagesFor(botKey, [...stored, bot]);
          return next;
        });
      }, 900);

      setBotIndex((i) => (i + 1) % fakeMessages.length);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Kunde inte skicka meddelandet.";
      setErr(msg);
    }
  }

  async function handleDelete(m) {
    const mineFlag = isMine(m, my, usersMap);
    const isBot = m.uid === "bot";
    if (!mineFlag && !isBot) return;

    if (isBot) {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      const kept = loadBotMessagesFor(botKey).filter((x) => x.id !== m.id);
      saveBotMessagesFor(botKey, kept);
      return;
    }

    try {
      if (m.id != null) await deleteMessage(token, m.id);
    } catch {}
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SideNav />
      <div style={{ marginLeft: 220, flex: 1 }}>
        <div className="chat-shell">
          <div className="chat-card">
            <div className="chat-header">
              <div className="header-user">
                <img
                  className="avatar"
                  src={myAvatar}
                  alt=""
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                />
                <span>{myDisplayName}</span>
              </div>
            </div>

            {err && <div className="alert">{err}</div>}

            <div className="chat-body" ref={listRef}>
              {messages.length === 0 && (
                <div className="empty-hint">Inga meddelanden ännu.</div>
              )}

              {messages.map((m, i) => {
                const mineFlag = isMine(m, my, usersMap);
                const who =
                  m.uid === "bot"
                    ? "bot"
                    : usersMap[m.uid] || m.user?.username || "User";
                const time = toLocalTime(m.createdAtIso);
                const safeHtml = DOMPurify.sanitize(m.text || "");
                const avatarUrl = mineFlag
                  ? myAvatar
                  : m.user?.avatar || "https://i.pravatar.cc/150?u=user";

                return (
                  <div
                    key={m.id ?? `local-${i}`}
                    className={`msg-row ${mineFlag ? "me" : "other"}`}
                  >
                    {!mineFlag && (
                      <img
                        className="msg-avatar"
                        src={avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div className={`bubble ${mineFlag ? "me" : "other"}`}>
                      <div className="meta">
                        <strong>{who}</strong>
                        <small>{time}</small>
                      </div>

                      <div
                        className="text"
                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                      />

                      {(mineFlag || m.uid === "bot") && (
                        <button
                          className="trash"
                          title="Ta bort"
                          onClick={() => handleDelete(m)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {mineFlag && (
                      <img
                        className="msg-avatar"
                        src={avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="chat-input">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Skriv ett meddelande..."
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button className="btn-send" onClick={handleSend}>
                Skicka
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
