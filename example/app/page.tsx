"use client";

import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <p>Loading...</p>;
  }

  if (session) {
    return (
      <div>
        <h1>better-auth-offline Example</h1>
        <p>
          Signed in as <strong>{session.user.email}</strong>.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0070f3",
            color: "white",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>better-auth-offline Example</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Sign in or create an account to test the offline plugin.
      </p>
      <AuthForm />
    </div>
  );
}
