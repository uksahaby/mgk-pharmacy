import type { Metadata } from "next";
import { requireUser } from "@/lib/server-api";
import { PageHeader } from "@/components/ui";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div className="space-y-6">
      <PageHeader title="Profile & security" subtitle="Keep your details up to date so our pharmacists and riders can reach you." />
      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
    </div>
  );
}
