"use client";

import { useState } from "react";

export default function PromoteTestPage() {
  const [userId, setUserId] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const promote = async () => {
    setLoading(true);
    setResponse(null);

    const res = await fetch("/api/admin/user/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResponse(`Error: ${data.error}`);
    } else {
      setResponse("User promoted successfully.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 500 }}>
      <h1>Admin Promotion Test</h1>

      <label style={{ display: "block", marginTop: "1rem" }}>
        Target User ID (UUID)
      </label>
      <input
        type="text"
        style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
        placeholder="user UUID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />

      <button
        onClick={promote}
        disabled={loading}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          background: "#000",
          color: "#fff",
        }}
      >
        {loading ? "Promoting..." : "Promote To Admin"}
      </button>

      {response && (
        <p style={{ marginTop: "1rem", color: response.startsWith("Error") ? "red" : "green" }}>
          {response}
        </p>
      )}
    </div>
  );
}
