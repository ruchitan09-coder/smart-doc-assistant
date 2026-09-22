"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="font-display text-2xl font-medium text-center mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Start asking questions about your documents.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password (min 6 characters)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account? <Link href="/sign-in" className="text-brand-500">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
