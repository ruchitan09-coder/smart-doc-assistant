"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function DeleteAccountButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("This will permanently delete your account and all documents. Continue?")) return;
    setLoading(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      alert("Could not delete account. Please try again.");
    }
  }

  return (
    <Button variant="danger" onClick={handleDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete my account"}
    </Button>
  );
}
