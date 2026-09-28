"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, buttonClass } from "@/components/ui";

async function call(url: string, method: "POST" | "DELETE"): Promise<string | null> {
  try {
    const res = await fetch(url, { method });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "Something went wrong. Please try again.";
  } catch {
    return "Could not reach the server. Please try again.";
  }
}

export function CvActions({ resumeId, filename, parsed }: { resumeId: string; filename: string; parsed: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"delete" | "reparse" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "delete" | "reparse") {
    setBusy(true);
    setError(null);
    const err = kind === "delete"
      ? await call(`/api/resumes/${resumeId}`, "DELETE")
      : await call(`/api/resumes/${resumeId}/parse`, "POST");
    setBusy(false);
    setConfirming(null);
    if (err) {
      setError(err);
      return;
    }
    if (kind === "delete") router.push("/cv");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/resumes/${resumeId}/file`} className={buttonClass("secondary")}>
          Download original
        </a>
        <Button variant="secondary" disabled={busy} onClick={() => (parsed ? setConfirming("reparse") : void run("reparse"))}>
          {parsed ? "Re-run extraction" : "Retry parsing"}
        </Button>
        <Button variant="ghost" className="text-red-700" disabled={busy} onClick={() => setConfirming("delete")}>
          Delete CV
        </Button>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {confirming ? (
        <div role="alertdialog" aria-labelledby="confirm-title" className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
          <p id="confirm-title" className="text-sm font-medium text-slate-900">
            {confirming === "delete"
              ? `Delete "${filename}"? The original file and all extracted data will be permanently removed.`
              : "Re-run extraction from the original file? Your manual edits to this CV will be replaced."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant={confirming === "delete" ? "danger" : "primary"} disabled={busy} onClick={() => void run(confirming)}>
              {busy ? "Working..." : confirming === "delete" ? "Delete permanently" : "Re-run extraction"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
