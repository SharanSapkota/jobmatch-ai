import type { NextAuthConfig } from "next-auth";

export const PROTECTED_PREFIXES = ["/dashboard", "/jobs", "/cv", "/applications", "/profile", "/settings"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Provider-free config shared by the proxy and the full Auth.js instance. */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
