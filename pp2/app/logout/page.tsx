"use client";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/";
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-xl text-zinc-700 dark:text-zinc-200">Logging out...</div>
    </div>
  );
}
