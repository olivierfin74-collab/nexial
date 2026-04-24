"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=/app",
      },
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage(
        "Compte créé. Vérifie ton email puis clique sur le lien de confirmation."
      );
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-semibold">Créer un compte</h1>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded border px-4 py-2"
        >
          {loading ? "Création..." : "Créer compte"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {errorMsg && <p className="mt-4 text-sm text-red-600">{errorMsg}</p>}

      <div className="mt-6 space-y-2 text-sm">
        <div>
          <Link href="/login" className="underline">
            Déjà un compte ? Se connecter
          </Link>
        </div>
        <div>
          <Link href="/reset-password" className="underline">
            Mot de passe oublié
          </Link>
        </div>
      </div>
    </main>
  );
}