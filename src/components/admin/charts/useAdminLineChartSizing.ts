"use client";

import { useEffect, useRef, useState } from "react";

export function useAdminLineChartSizing(height: number) {
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const chartHeight = isCompact ? Math.max(220, Math.round(height * 0.8)) : height;
  const yAxisWidth = isCompact ? 60 : 84;
  const tickFontSize = isCompact ? 10 : 12;
  const chartMargin = isCompact
    ? { top: 8, right: 12, bottom: 6, left: 4 }
    : { top: 8, right: 18, bottom: 8, left: 12 };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsCompact(media.matches);
    handleChange();

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let raf = 0;
    const update = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }

      raf = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const parentWidth = element.parentElement?.clientWidth ?? 0;
        const width = Math.max(
          1,
          Math.floor(element.clientWidth || rect.width || parentWidth),
        );
        const nextHeight = Math.max(
          1,
          Math.floor(element.clientHeight || rect.height || chartHeight),
        );
        const next = { width, height: nextHeight };

        setContainerSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next,
        );
      });
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => {
        observer.disconnect();
        if (raf) {
          cancelAnimationFrame(raf);
        }
      };
    }

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [chartHeight]);

  return {
    chartHeight,
    chartMargin,
    containerRef,
    containerSize,
    isCompact,
    tickFontSize,
    yAxisWidth,
  };
}
