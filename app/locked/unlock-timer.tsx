"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function UnlockTimer({ unlockAtIso }: { unlockAtIso: string }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const unlockTime = new Date(unlockAtIso).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = unlockTime - now;

      if (diff <= 0) {
        router.push("/");
        router.refresh();
        return;
      }

      // Calculate days, hours, minutes, seconds
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial call

    return () => clearInterval(interval);
  }, [unlockAtIso, router]);

  return <span>{timeLeft || "soon"}</span>;
}
