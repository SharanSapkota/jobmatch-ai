import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

// Redirects signed-out visitors away from app pages. Server actions and route
// handlers still call requireUser()/getApiUser() themselves.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/cv/:path*", "/applications/:path*", "/profile/:path*", "/settings/:path*"],
};
