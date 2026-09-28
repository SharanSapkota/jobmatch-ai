import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/server/db";
import { authConfig } from "@/server/auth/auth.config";
import { verifyCredentials } from "@/server/auth/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) => verifyCredentials(prisma, credentials),
    }),
  ],
});
