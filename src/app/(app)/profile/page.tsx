import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/modules/profile/profile-service";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await getProfile(prisma, user.id);
  return (
    <>
      <PageHeader title="Profile" description="Your background and what you are looking for." />
      <ProfileForm
        values={{
          headline: p?.headline ?? "",
          summary: p?.summary ?? "",
          yearsExperience: p?.yearsExperience?.toString() ?? "",
          location: p?.location ?? "",
          desiredRoles: p?.desiredRoles.join(", ") ?? "",
          preferredLocations: p?.preferredLocations.join(", ") ?? "",
          workMode: p?.workMode ?? "ANY",
          salaryExpectation: p?.salaryExpectation ?? "",
          workAuthorization: p?.workAuthorization ?? "",
          languages: p?.languages.join(", ") ?? "",
          industries: p?.industries.join(", ") ?? "",
        }}
      />
    </>
  );
}
