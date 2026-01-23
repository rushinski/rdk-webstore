// src/components/chat/ChatLauncher.tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

export function ChatLauncher() {
  const handleOpen = () => window.dispatchEvent(new CustomEvent("openChat"));
  const [collapsed, setCollapsed] = useState(false);

  // Smaller overall footprint
  const launcherWidth = 22; // was 32
  const tabWidth = 4; // was 6

  // Smaller popout handle (not full height)
  const toggleWidth = 12; // was 18
  const toggleHeight = 30; // was 44

  // How far the handle overlaps into the launcher to hide seam
  const overlapPx = 2;

  return (
    <>
      {/* Mobile launcher */}
      <div className="md:hidden fixed right-0 top-[60%] -translate-y-1/2 z-40">
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{
            width: `${launcherWidth}px`,
            transform: collapsed
              ? `translateX(${launcherWidth - tabWidth}px)`
              : "translateX(0)",
          }}
        >
          {/* Red launcher (tap ALWAYS opens chat) */}
          <button
            type="button"
            onClick={handleOpen}
            className="bg-red-600 text-white h-28 flex flex-col items-center justify-center gap-1 shadow-lg border border-red-700 rounded-l-xl"
            style={{ width: `${launcherWidth}px` }}
            aria-label="Chat with us"
          >
            <div className="flex flex-col items-center justify-center gap-1 rotate-180">
              <MessageCircle className="w-3.5 h-3.5" />
              <span
                className={[
                  "[writing-mode:vertical-rl] [text-orientation:mixed]", // <-- no rotate here now
                  "text-[11px] font-semibold tracking-wide leading-none",
                  collapsed ? "opacity-0 pointer-events-none select-none" : "opacity-100",
                  "transition-opacity duration-150",
                ].join(" ")}
              >
                Chat with us
              </span>
            </div>
          </button>

          {/* Pop-out chevron handle (seamless: overlaps + no right border) */}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className={[
              "absolute top-1/2 -translate-y-1/2",
              "flex items-center justify-center",
              "bg-red-600 text-white",
              "border border-red-700 border-r-0", // IMPORTANT: no border where it meets launcher
              "shadow-lg",
              "rounded-l-xl",
              "hover:bg-red-500 active:bg-red-700 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              "z-10", // ensure it sits above launcher border
            ].join(" ")}
            style={{
              // push it slightly INTO the launcher to cover the launcher’s border and remove the seam
              left: `-${toggleWidth - overlapPx}px`,
              width: `${toggleWidth}px`,
              height: `${toggleHeight}px`,
            }}
            aria-label={collapsed ? "Show chat launcher" : "Hide chat launcher"}
          >
            {collapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop launcher */}
      <button
        type="button"
        onClick={handleOpen}
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 items-center justify-center bg-red-600 text-white shadow-lg border border-red-700 z-40 rounded-full hover:bg-red-500 active:bg-red-700 transition-colors"
        aria-label="Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
}
