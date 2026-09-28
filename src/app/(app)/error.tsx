"use client";

import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-600">The page could not be loaded. Your data has not been changed.</p>
      <Button className="mt-5" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
