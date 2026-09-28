import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <>
      <PageHeader title="Jobs" description="Jobs matched against your CV and preferences." />
      <EmptyState
        title="Job search is not available yet"
        description="Adding jobs, job discovery and match analysis are being built next. Meanwhile, upload your CV and complete your profile so matching can start as soon as it is ready."
      />
    </>
  );
}
