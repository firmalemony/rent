"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Načítám…</div>;
  }

  if (session?.user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>Přihlášen: {session.user.name || session.user.email}</span>
        <button onClick={() => signOut()} style={{ padding: "6px 10px" }}>Odhlásit</button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn("google")} style={{ padding: "6px 10px" }}>Přihlásit se Google</button>
  );
}





