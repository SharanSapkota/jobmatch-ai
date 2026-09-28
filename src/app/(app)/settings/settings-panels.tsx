"use client";

import { useActionState } from "react";
import { Alert, Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { clearLlmDataAction, deleteAccountAction, type SettingsState } from "./actions";

export function ClearLlmDataPanel() {
  const [state, action, pending] = useActionState<SettingsState>(clearLlmDataAction, { status: "idle" });
  return (
    <Card>
      <CardHeader
        title="Clear AI-generated data"
        description="Removes cached AI results, job match analyses, CV recommendations and tailored CVs. Your uploaded CV and your edits to it are kept."
      />
      {state.status === "done" ? <div className="mb-4"><Alert tone="success">{state.message}</Alert></div> : null}
      <form action={action}>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Clearing..." : "Clear AI-generated data"}
        </Button>
      </form>
    </Card>
  );
}

export function DeleteAccountPanel({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(deleteAccountAction, { status: "idle" });
  return (
    <Card className="border-red-200">
      <CardHeader
        title="Delete account"
        description="Permanently deletes your account, CVs, profile, saved jobs, applications and all analyses. This cannot be undone."
      />
      <form action={action} className="max-w-sm space-y-3">
        {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
        <Field label={`Type ${email} to confirm`} htmlFor="confirmEmail">
          <Input id="confirmEmail" name="confirmEmail" autoComplete="off" required />
        </Field>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Deleting..." : "Delete my account"}
        </Button>
      </form>
    </Card>
  );
}
