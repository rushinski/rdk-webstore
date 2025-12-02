// app/auth/logout/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <main>
      <h1>Logout</h1>
      <button onClick={handleLogout}>Log out</button>
    </main>
  );
}
