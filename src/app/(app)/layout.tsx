import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { logoutAction } from "../(auth)/actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-4 pt-3">
            <Link href="/dashboard" className="font-semibold text-slate-900">
              JobMatch AI
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-600 sm:inline">{user.email}</span>
              <form action={logoutAction}>
                <button type="submit" className="rounded-md px-2 py-1 font-medium text-slate-700 hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
