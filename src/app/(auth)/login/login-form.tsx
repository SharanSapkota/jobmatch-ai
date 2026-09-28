"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { loginAction, type AuthFormState } from "../actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-blue-700 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
