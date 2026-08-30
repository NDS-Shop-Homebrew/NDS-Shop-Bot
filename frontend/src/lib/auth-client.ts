import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

const API_URL = import.meta.env.VITE_API_URL;

export const authClient = createAuthClient({
  baseURL: API_URL || undefined,
  plugins: [usernameClient(), adminClient()],
});