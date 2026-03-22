"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (error) {
          setError(error.message ?? "Sign up failed");
          return;
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          setError(error.message ?? "Sign in failed");
          return;
        }
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
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setMode("signin")}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            borderBottom: mode === "signin" ? "2px solid #0070f3" : "2px solid transparent",
            background: "none",
            cursor: "pointer",
            fontWeight: mode === "signin" ? 600 : 400,
            fontSize: "1rem",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            borderBottom: mode === "signup" ? "2px solid #0070f3" : "2px solid transparent",
            background: "none",
            cursor: "pointer",
            fontWeight: mode === "signup" ? 600 : 400,
            fontSize: "1rem",
          }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
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
        >
          {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
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
