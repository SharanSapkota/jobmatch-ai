import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { ClearLlmDataPanel, DeleteAccountPanel } from "./settings-panels";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Settings" description="Account and privacy." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" />
          <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-slate-500">Name</dt>
            <dd>{user.name ?? "Not set"}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd>{user.email}</dd>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Your data" />
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Your CV and profile are visible only to you.</li>
            <li>Before your CV is sent to an AI provider, email addresses, phone numbers and links are removed.</li>
            <li>You can delete a CV at any time from My CV.</li>
          </ul>
        </Card>
        <ClearLlmDataPanel />
        <DeleteAccountPanel email={user.email} />
      </div>
    </>
  );
}
