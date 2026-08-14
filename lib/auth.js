// Better Auth du bot — MÊMES comptes que upload.db-nds-shop.fr (même base, même hachage).
const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("better-auth/adapters/prisma");
const { username, admin } = require("better-auth/plugins");
const { createAccessControl } = require("better-auth/plugins/access");
const bcrypt = require("bcrypt");
const prisma = require("./db");

const statement = {
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
};
const ac = createAccessControl(statement);
const adminRole = ac.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const member = ac.newRole({ user: [], session: [] });

module.exports = betterAuth({
  appName: "NDS-Shop Bot Dashboard",
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ password, hash }) => bcrypt.compare(password, hash),
    },
  },
  plugins: [
    username(),
    admin({
      ac,
      roles: { admin: adminRole, member },
      adminRoles: ["admin"],
      defaultRole: "member",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    "https://bot.db-nds-shop.fr",
    "http://localhost:3004",
  ].filter(Boolean),
});
