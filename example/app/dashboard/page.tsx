"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending, error } = authClient.useSession();
  const [cacheMessage, setCacheMessage] = useState("");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
  }

  async function handleClearCache() {
    // @ts-expect-error — clearCache is added by the offline plugin
    await authClient.clearCache();
    setCacheMessage("Cache cleared!");
    setTimeout(() => setCacheMessage(""), 2000);
  }

  if (isPending) {
    return <p>Loading session...</p>;
  }

  if (!session) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p style={{ color: "#e00" }}>
          {error ? `Error: ${error.message}` : "Not authenticated."}
        </p>
        <p>
          <a href="/" style={{ color: "#0070f3" }}>
            Go to sign in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <OnlineIndicator />
      </div>

      {/* Session Info */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Session Info</h2>
        <dl style={{ margin: 0 }}>
          <dt style={dtStyle}>Email</dt>
          <dd style={ddStyle}>{session.user.email}</dd>
          <dt style={dtStyle}>User ID</dt>
          <dd style={ddStyle}>
            <code>{session.user.id}</code>
          </dd>
          <dt style={dtStyle}>Session ID</dt>
          <dd style={ddStyle}>
            <code>{session.session.id}</code>
          </dd>
          <dt style={dtStyle}>Name</dt>
          <dd style={ddStyle}>{session.user.name || "—"}</dd>
        </dl>
      </section>

      {/* Cache Controls */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Cache Controls</h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={handleClearCache} style={buttonStyle}>
            Clear Cache
          </button>
          <button onClick={handleSignOut} style={{ ...buttonStyle, backgroundColor: "#e00" }}>
            Sign Out
          </button>
          {cacheMessage && (
            <span style={{ color: "#16a34a", fontSize: "0.9rem" }}>{cacheMessage}</span>
          )}
        </div>
        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
          Sign Out also clears the cache automatically (cross-user safety).
        </p>
      </section>

      {/* Testing Instructions */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>How to Test Offline Mode</h2>
        <ol style={{ paddingLeft: "1.25rem", margin: 0, lineHeight: 1.8 }}>
          <li>Open DevTools (F12)</li>
          <li>
            Go to <strong>Network</strong> tab
          </li>
          <li>
            Check the <strong>Offline</strong> checkbox
          </li>
          <li>
            Refresh the page — session data should still appear (served from IndexedDB cache)
          </li>
          <li>
            The status indicator above should show <strong style={{ color: "#e00" }}>Offline</strong>
          </li>
          <li>Uncheck Offline — indicator returns to Online</li>
        </ol>
        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.75rem" }}>
          To inspect the cache: DevTools → Application → IndexedDB → better-auth-offline → cache
        </p>
      </section>
    </div>
  );
}

function OnlineIndicator() {
  // @ts-expect-error — useOnlineStatus is added by the offline plugin
  const status = authClient.useOnlineStatus();
  const isOnline = status ?? true;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.75rem",
        borderRadius: "999px",
        backgroundColor: isOnline ? "#dcfce7" : "#fce7e7",
        fontSize: "0.85rem",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: isOnline ? "#16a34a" : "#e00",
        }}
      />
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
  padding: "1.25rem",
  backgroundColor: "white",
  borderRadius: "8px",
  border: "1px solid #eee",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 0.75rem 0",
  fontSize: "1.1rem",
};

const dtStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.85rem",
  color: "#666",
  marginTop: "0.5rem",
};

const ddStyle: React.CSSProperties = {
  margin: "0.15rem 0 0 0",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  backgroundColor: "#0070f3",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.9rem",
  cursor: "pointer",
};
