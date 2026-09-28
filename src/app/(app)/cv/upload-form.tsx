"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button } from "@/components/ui";

const MAX_MB = 5;

export function UploadForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`The file is too large. The maximum size is ${MAX_MB} MB.`);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Upload failed. Please try again.");
        return;
      }
      router.push(`/cv?id=${data.id}`);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <input
        ref={input}
        id="cv-file"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {compact ? (
        <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading and analysing..." : "Upload new version"}
        </Button>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">Upload your CV</p>
          <p className="mt-1 text-sm text-slate-600">PDF or Word (.docx), up to {MAX_MB} MB. Text-based files only; scanned images cannot be read yet.</p>
          <Button className="mt-4" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading and analysing..." : "Choose file"}
          </Button>
          {busy ? <p className="mt-3 text-xs text-slate-500" aria-live="polite">This can take a few seconds.</p> : null}
        </div>
      )}
    </div>
  );
}
