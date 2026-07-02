"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { logError } from "@/lib/utils/log";
import type { StateSummary } from "@/types/domain/nexus";

type Point = { x: number; y: number };

function svgPointToContainer(
  svgEl: SVGSVGElement,
  containerEl: HTMLElement,
  svgX: number,
  svgY: number,
): Point {
  const pt = svgEl.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;

  const ctm = svgEl.getScreenCTM();
  if (!ctm) {
    return { x: 0, y: 0 };
  }

  const screen = pt.matrixTransform(ctm);
  const containerRect = containerEl.getBoundingClientRect();

  return { x: screen.x - containerRect.left, y: screen.y - containerRect.top };
}

export function useNexusMapInteraction(states: StateSummary[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [topology, setTopology] = useState<unknown | null>(null);

  const stateMap = useMemo(() => new Map(states.map((s) => [s.stateCode, s])), [states]);
  const hoveredData = hoveredState ? stateMap.get(hoveredState) : null;

  useEffect(() => {
    let alive = true;

    fetch("/api/maps/us-states", { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Map fetch failed: ${r.status}`);
        }
        return r.json();
      })
      .then((json) => {
        if (alive) {
          setTopology(json);
        }
      })
      .catch((err) => {
        logError(err, { layer: "frontend", event: "nexus_map_topology_failed" });
      });

    return () => {
      alive = false;
    };
  }, []);

  const clearHover = useCallback(() => {
    setHoveredState(null);
    setAnchor(null);
  }, []);

  const setAnchorFromPath = useCallback((pathEl: SVGPathElement | null) => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg || !pathEl) {
      return;
    }

    const bbox = pathEl.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    setAnchor(svgPointToContainer(svg, container, cx, cy));
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!hoveredState) {
        return;
      }

      const target = event.target as Element | null;
      if (target?.tagName?.toLowerCase() !== "path") {
        clearHover();
      }
    },
    [clearHover, hoveredState],
  );

  const handleStateMouseEnter = useCallback(
    (stateCode: string | undefined, pathEl: SVGPathElement | null) => {
      if (!stateCode) {
        return;
      }
      setHoveredState(stateCode);
      setAnchorFromPath(pathEl);
    },
    [setAnchorFromPath],
  );

  const tooltipWidth = 280;

  const tooltipPos = useMemo(() => {
    if (!anchor) {
      return null;
    }
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const padding = 12;

    let left = anchor.x + 18;
    let top = anchor.y - 140;

    if (left + tooltipWidth + padding > rect.width) {
      left = Math.max(padding, anchor.x - tooltipWidth - 18);
    }
    if (left < padding) {
      left = padding;
    }

    if (top < padding) {
      top = padding;
    }
    if (top > rect.height - 190) {
      top = rect.height - 190;
    }

    return { left, top };
  }, [anchor, tooltipWidth]);

  return {
    anchor,
    clearHover,
    containerRef,
    handleMouseMove,
    handleStateMouseEnter,
    hoveredData,
    svgRef,
    tooltipPos,
    tooltipWidth,
    topology,
  };
}
