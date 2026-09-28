import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if ((await auth())?.user) redirect("/dashboard");
  const { callbackUrl } = await searchParams;
  let path: string | undefined;
  if (typeof callbackUrl === "string") {
    try {
      // Auth.js passes an absolute URL; keep only the path.
      const url = new URL(callbackUrl, "http://localhost");
      path = url.pathname + url.search;
    } catch {
      path = undefined;
    }
  }
  return <LoginForm callbackUrl={path} />;
}
