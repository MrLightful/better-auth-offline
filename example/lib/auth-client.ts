"use client";

import { createAuthClient } from "better-auth/react";
import { offlinePlugin } from "better-auth-offline";

export const authClient = createAuthClient({
  plugins: [offlinePlugin()],
});
