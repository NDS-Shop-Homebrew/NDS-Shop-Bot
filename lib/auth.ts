import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import bcrypt from "bcrypt";
import prisma from "./db.js";

const statement = {
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
};

const ac = createAccessControl(statement);
const superAdminRole = ac.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const adminRole = ac.newRole({
  user: ["create", "list", "ban", "set-password", "get", "update"],
  session: ["list", "revoke"],
});
const memberRole = ac.newRole({ user: [], session: [] });

export const auth = betterAuth({
  appName: "NDS-Shop Bot Dashboard",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3004",
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    password: {
      hash: async (password: string) => bcrypt.hash(password, 10),
      verify: async ({ password, hash }: { password: string; hash: string }) => bcrypt.compare(password, hash),
    },
  },
  plugins: [
    username(),
    admin({
      ac,
      roles: { "super-admin": superAdminRole, admin: adminRole, member: memberRole },
      adminRoles: ["super-admin", "admin"],
      defaultRole: "member",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    "https://bot.db-nds-shop.fr",
    "http://localhost:3004",
    "http://localhost:5175",
  ].filter(Boolean) as string[],
});
