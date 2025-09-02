import { useEffect, useState } from "react";

export default function RequireAuth({ children }) {
    const [allowed, setAllowed] = useState(null);

    useEffect(() => {
        fetch("/api/me", { credentials: "include" })
        .then((r) => setAllowed(r.ok))
        .catch(() => setAllowed(false));
    }, []);

    if (allowed === null) return <p>Laddar…</p>;
    if (!allowed) {
        window.location.href = "/login";
        return null;
    }
    return children;
}
