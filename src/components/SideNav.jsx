import { useEffect, useMemo, useState } from "react";
import "../styles/SideNav.css";
import logo from "../assets/logo.png";

function getStoredUser() {
    try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        if (u && typeof u === "object") return u;
    } catch {}
    return null;
    }

    function computeIdentity() {
    const userObj = getStoredUser();
    const username =
        userObj?.username ??
        userObj?.user ??
        localStorage.getItem("username") ??
        "Användare";

    const avatar =
        userObj?.avatar ??
        localStorage.getItem("avatar") ??
        
        `https://i.pravatar.cc/80?u=${encodeURIComponent(username)}`;

    return { username, avatar };
    }

    export default function SideNav() {
    const [me, setMe] = useState(() => computeIdentity());

    useEffect(() => {
        const onStorage = () => setMe(computeIdentity());
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const handleLogout = () => {
        ["token", "user", "username", "userId", "messages", "avatar"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
    });
    
    window.dispatchEvent(new StorageEvent("storage"));
    window.location.replace("/login");
    };

    return (
        <aside className="sidenav" role="navigation" aria-label="Sidomeny">
        <div className="sidenav-brand">
            <img src={logo} alt="Snabbsnack logo" className="sidenav-logo" />
        </div>

        <div className="sidenav-user">
        <img
            className="sidenav-user__avatar"
            src={me.avatar}
            alt={me.username}
            width={40}
            height={40}
            referrerPolicy="no-referrer"
        />
        <div className="sidenav-user__name">{me.username}</div>
        </div>

        <div className="sidenav-actions">
            <button type="button" className="sidenav-btn danger" onClick={handleLogout}>
            Logga ut
            </button>
        </div>
        </aside>
    );
}
