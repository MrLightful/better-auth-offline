"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        setError(error.message ?? "Sign in failed");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
        Demo credentials are pre-filled below.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <input
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          style={inputStyle}
          type="email"
          value={email}
        />
        <input
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          style={inputStyle}
          type="password"
          value={password}
        />
        <button
          disabled={loading}
          style={{
            padding: "0.75rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
          type="submit"
        >
          {loading ? "Loading..." : "Sign In"}
        </button>
      </form>

      {error && (
        <p style={{ color: "#e00", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "1rem",
  outline: "none",
};
