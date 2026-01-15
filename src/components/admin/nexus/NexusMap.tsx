// src/components/admin/nexus/NexusMap.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import type { StateSummary } from "@/types/domain/nexus";
import { clientEnv } from "@/config/client-env";

type NexusMapProps = {
  states: StateSummary[];
  onStateClick: (state: StateSummary) => void;
  getStateColor: (state: StateSummary | undefined) => string;
  formatCurrency: (val: number) => string;
};

// US GeoJSON topology URL from CDN
const geoUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/api/maps/us-states`;

// State name to code mapping for tooltip lookup
const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

type Point = { x: number; y: number };

/**
 * Convert an SVG element point into container-local coordinates.
 */
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
  if (!ctm) return { x: 0, y: 0 };

  const screen = pt.matrixTransform(ctm);
  const containerRect = containerEl.getBoundingClientRect();

  return {
    x: screen.x - containerRect.left,
    y: screen.y - containerRect.top,
  };
}

export default function NexusMap({
  states,
  onStateClick,
  getStateColor,
  formatCurrency,
}: NexusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);

  const stateMap = useMemo(() => new Map(states.map((s) => [s.stateCode, s])), [states]);
  const hoveredData = hoveredState ? stateMap.get(hoveredState) : null;

  /**
   * Update tooltip anchor to the hovered geography centroid (in container coords).
   * We read the SVG path bounding box and use its center as a stable anchor.
   */
  const updateAnchorFromPath = (pathEl: SVGPathElement | null) => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg || !pathEl) return;

    const bbox = pathEl.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    setAnchor(svgPointToContainer(svg, container, cx, cy));
  };

  // Tooltip layout tuning
  const tooltipOffset = { x: 18, y: -18 };
  const tooltipWidth = 260;

  // Compute tooltip position within container (and keep it from overflowing hard)
  const tooltipPos = useMemo(() => {
    if (!anchor) return null;

    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const padding = 12;

    // default: to the right & slightly above the anchor
    let left = anchor.x + tooltipOffset.x;
    let top = anchor.y + tooltipOffset.y - 120;

    // clamp horizontally
    if (left + tooltipWidth + padding > rect.width) {
      left = Math.max(padding, anchor.x - tooltipWidth - tooltipOffset.x);
    }
    if (left < padding) left = padding;

    // clamp vertically a bit
    if (top < padding) top = padding;
    if (top > rect.height - 160) top = rect.height - 160;

    return { left, top };
  }, [anchor]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 relative">
      <h2 className="text-xl font-bold text-white mb-6">United States Nexus Map</h2>

      <div ref={containerRef} className="relative">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          className="w-full h-full"
          style={{ maxHeight: "600px" }}
          // NOTE: composable map renders an <svg> under the hood; we grab it via ref callback
          ref={(node: any) => {
            // react-simple-maps sets ref to the SVG element
            svgRef.current = node as SVGSVGElement | null;
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name as string;
                const stateCode = STATE_NAME_TO_CODE[stateName];
                const stateData = stateCode ? stateMap.get(stateCode) : undefined;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getStateColor(stateData)}
                    stroke="#1f2937"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: getStateColor(stateData),
                        opacity: 0.85,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      if (!stateCode) return;
                      setHoveredState(stateCode);
                      updateAnchorFromPath(e.currentTarget as unknown as SVGPathElement);
                    }}
                    onMouseMove={(e) => {
                      // keep anchor stable even if user wiggles mouse / map reflows
                      if (!stateCode) return;
                      updateAnchorFromPath(e.currentTarget as unknown as SVGPathElement);
                    }}
                    onMouseLeave={() => {
                      setHoveredState(null);
                      setAnchor(null);
                    }}
                    onClick={() => {
                      if (stateData) onStateClick(stateData);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Tooltip anchored near the hovered state (container-local, not fixed to viewport) */}
        {hoveredData && anchor && tooltipPos && (
          <div className="pointer-events-none absolute inset-0 z-50">
            {/* Pointer line (comic box vibe) */}
            <svg className="absolute inset-0" aria-hidden="true">
              <line
                x1={anchor.x}
                y1={anchor.y}
                x2={tooltipPos.left}
                y2={tooltipPos.top + 24}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2"
              />
            </svg>

            {/* Tooltip box */}
            <div
              className="absolute"
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                width: tooltipWidth,
              }}
            >
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl">
                <div className="font-bold mb-2 text-white text-lg">
                  {hoveredData.stateName}
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
                    <div className="text-blue-400 text-xs pt-1">★ Home State</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
