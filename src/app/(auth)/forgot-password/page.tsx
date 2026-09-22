"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("If an account exists for that email, a reset link has been sent.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-center mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we'll send you a reset link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
