import type { Metadata } from "next";
import { ServiceWorkerRegistration } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "better-auth-offline Example",
  description: "Example app demonstrating the better-auth offline plugin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: "2rem",
          maxWidth: "640px",
          marginInline: "auto",
          lineHeight: 1.6,
          color: "#1a1a1a",
          backgroundColor: "#fafafa",
        }}
      >
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
