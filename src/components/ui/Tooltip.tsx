"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipSide = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  label: string;
  side?: TooltipSide;
  offset?: number;
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean; // ✅ important for grid usage
};

export function Tooltip({
  label,
  side = "top",
  offset = 10,
  children,
  disabled,
  fullWidth = false,
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const compute = () => {
    const el = anchorRef.current;
    if (!el) {
      return;
    }

    const r = el.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const centerY = r.top + r.height / 2;

    let top = 0;
    let left = 0;

    if (side === "top") {
      top = r.top - offset;
      left = centerX;
    } else if (side === "bottom") {
      top = r.bottom + offset;
      left = centerX;
    } else if (side === "left") {
      top = centerY;
      left = r.left - offset;
    } else {
      top = centerY;
      left = r.right + offset;
    }

    setPos({ top, left });
  };

  const show = () => {
    if (disabled) {
      return;
    }
    compute();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const transform = useMemo(() => {
    if (side === "top") {
      return "translate(-50%, -100%)";
    }
    if (side === "bottom") {
      return "translate(-50%, 0%)";
    }
    if (side === "left") {
      return "translate(-100%, -50%)";
    }
    return "translate(0%, -50%)";
  }, [side]);

  const arrowClass = useMemo(() => {
    if (side === "top") {
      return "left-1/2 -translate-x-1/2 top-full border-x-[6px] border-x-transparent border-t-[6px] border-t-black";
    }
    if (side === "bottom") {
      return "left-1/2 -translate-x-1/2 bottom-full border-x-[6px] border-x-transparent border-b-[6px] border-b-black";
    }
    if (side === "left") {
      return "top-1/2 -translate-y-1/2 left-full border-y-[6px] border-y-transparent border-l-[6px] border-l-black";
    }
    return "top-1/2 -translate-y-1/2 right-full border-y-[6px] border-y-transparent border-r-[6px] border-r-black";
  }, [side]);

  return (
    <>
      <span
        ref={anchorRef}
        className={fullWidth ? "inline-flex w-full" : "inline-flex"}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>

      {mounted && open && pos
        ? createPortal(
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{ top: pos.top, left: pos.left, transform }}
            >
              <div className="relative">
                <div className="bg-black border border-zinc-800/70 text-white text-xs px-3 py-1.5 rounded-sm shadow-xl whitespace-nowrap">
                  {label}
                </div>
                <div className={`absolute w-0 h-0 border-solid ${arrowClass}`} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
