// src/components/admin/nexus/NexusMap.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import type { StateSummary } from "@/types/domain/nexus";

type NexusMapProps = {
  states: StateSummary[];
  onStateClick: (state: StateSummary) => void;
  getStateColor: (state: StateSummary | undefined) => string;
  formatCurrency: (val: number) => string;
  // NEW: provide legend items so the key can live inside this card
  legendItems: Array<{ label: string; color: string }>;
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

type Point = { x: number; y: number };

function svgPointToContainer(svgEl: SVGSVGElement, containerEl: HTMLElement, svgX: number, svgY: number): Point {
  const pt = svgEl.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;

  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  const screen = pt.matrixTransform(ctm);
  const containerRect = containerEl.getBoundingClientRect();

  return { x: screen.x - containerRect.left, y: screen.y - containerRect.top };
}

export default function NexusMap({
  states,
  onStateClick,
  getStateColor,
  formatCurrency,
  legendItems,
}: NexusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);

  const stateMap = useMemo(() => new Map(states.map((s) => [s.stateCode, s])), [states]);
  const hoveredData = hoveredState ? stateMap.get(hoveredState) : null;
  const [topology, setTopology] = useState<any>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/maps/us-states", { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`Map fetch failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (alive) setTopology(json);
      })
      .catch((err) => {
        console.error("Failed to load map topology:", err);
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
    if (!container || !svg || !pathEl) return;

    const bbox = pathEl.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    setAnchor(svgPointToContainer(svg, container, cx, cy));
  }, []);

  // Tooltip sizing/position
  const tooltipWidth = 280;

  const tooltipPos = useMemo(() => {
    if (!anchor) return null;
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const padding = 12;

    // Prefer right side; clamp inside container
    let left = anchor.x + 18;
    let top = anchor.y - 140;

    if (left + tooltipWidth + padding > rect.width) {
      left = Math.max(padding, anchor.x - tooltipWidth - 18);
    }
    if (left < padding) left = padding;

    if (top < padding) top = padding;
    if (top > rect.height - 190) top = rect.height - 190;

    return { left, top };
  }, [anchor]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">United States Nexus Map</h2>
      </div>

      <div
        ref={containerRef}
        className="relative"
        onMouseMove={(e) => {
          if (!hoveredState) return;
          const t = e.target as Element | null;
          if (t?.tagName?.toLowerCase() !== "path") clearHover();
        }}
        onMouseLeave={clearHover}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          className="w-full h-full"
          style={{ maxHeight: "560px" }}
          ref={(node: any) => {
            svgRef.current = node as SVGSVGElement | null;
          }}
        >
          <Geographies geography={topology}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name as string;
                const stateCode = STATE_NAME_TO_CODE[stateName];
                const stateData = stateCode ? stateMap.get(stateCode) : undefined;

                return (
                  <Geography
                    key={`${geo.rsmKey}-${geo.id ?? stateName}`}
                    geography={geo}
                    fill={getStateColor(stateData)}
                    stroke="#1f2937"
                    strokeWidth={0.6}
                    style={{
                      default: {
                        outline: "none",
                        transition: "transform 160ms ease, filter 160ms ease, opacity 160ms ease",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        transform: "scale(1)",
                        opacity: 1,
                      },
                      hover: {
                        outline: "none",
                        cursor: stateData ? "pointer" : "default",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        transform: "scale(1.045)",
                        filter: "drop-shadow(0px 3px 8px rgba(0,0,0,0.55))",
                        opacity: 0.96,
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      if (!stateCode) return;
                      setHoveredState(stateCode);
                      setAnchorFromPath(e.currentTarget as unknown as SVGPathElement);
                    }}
                    onMouseLeave={clearHover}
                    onClick={() => {
                      if (stateData) onStateClick(stateData);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Tooltip + connector (Image-4 style) */}
        {hoveredData && anchor && tooltipPos && (
          <div className="pointer-events-none absolute inset-0 z-50">
            <svg className="absolute inset-0" aria-hidden="true">
              {/* endpoint dot at state */}
              <circle cx={anchor.x} cy={anchor.y} r="5" fill="rgba(255,255,255,0.95)" />
              <circle cx={anchor.x} cy={anchor.y} r="9" fill="rgba(255,255,255,0.18)" />

              {/* double-stroke connector for contrast */}
              <path
                d={`M ${anchor.x} ${anchor.y}
                    Q ${anchor.x + 22} ${anchor.y - 26}
                      ${tooltipPos.left + 16} ${tooltipPos.top + 28}`}
                fill="none"
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d={`M ${anchor.x} ${anchor.y}
                    Q ${anchor.x + 22} ${anchor.y - 26}
                      ${tooltipPos.left + 16} ${tooltipPos.top + 28}`}
                fill="none"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            <div
              className="absolute transition-all duration-150 ease-out"
              style={{ left: tooltipPos.left, top: tooltipPos.top, width: tooltipWidth }}
            >
              <div className="bg-zinc-900 border-2 border-white/80 rounded-lg p-4 shadow-xl">
                <div className="font-bold mb-2 text-white text-lg">
                  {hoveredData.stateName} ({hoveredData.stateCode})
                </div>

                <div className="text-sm space-y-1 text-gray-300">
                  <div>Sales: {formatCurrency(hoveredData.relevantSales)}</div>
                  <div>Threshold: {formatCurrency(hoveredData.threshold)}</div>
                  <div className="font-semibold text-white pt-1">
                    {hoveredData.percentageToThreshold.toFixed(1)}% to threshold
                  </div>

                  {hoveredData.isRegistered && (
                    <div className="text-green-400 text-xs pt-1">✓ Registered</div>
                  )}
                  {hoveredData.isHomeState && (
                    <div className="text-blue-400 text-xs pt-1">★ Home Office State</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend ALWAYS at bottom (never inside tooltip) */}
        <div className="mt-4 flex flex-wrap gap-4">
          {legendItems.map((it) => (
            <div key={it.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: it.color }} />
              <span className="text-xs text-gray-400">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

