import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Nexial</h1>

      <div className="rounded border p-4">
        <p className="text-sm text-neutral-600">Utilisateur connecté</p>
        <p className="font-medium">{user.email}</p>
        <p className="mt-2 text-xs text-neutral-500">user_id: {user.id}</p>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}