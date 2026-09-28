import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader title="Applications" description="Track saved jobs, applications, interviews and outcomes." />
      <EmptyState
        title="Application tracking is not available yet"
        description="Once jobs can be added, you will be able to save them and track each application from Saved to Offer."
      />
    </>
  );
}
