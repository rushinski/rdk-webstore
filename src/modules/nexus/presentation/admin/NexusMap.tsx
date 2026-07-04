"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";

import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { useNexusMapInteraction } from "@/modules/nexus/presentation/admin/useNexusMapInteraction";
import type { StateSummary } from "@/types/domain/nexus";

type NexusMapProps = {
  states: StateSummary[];
  onStateClick: (state: StateSummary) => void;
  getStateColor: (state: StateSummary | undefined) => string;
  formatCurrency: (val: number) => string;
  legendItems: Array<{ label: string; color: string }>;
};

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

export default function NexusMap({
  states,
  onStateClick,
  getStateColor,
  formatCurrency,
  legendItems,
}: NexusMapProps) {
  const {
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
  } = useNexusMapInteraction(states);
  const stateMap = useMemo(() => new Map(states.map((s) => [s.stateCode, s])), [states]);

  return (
    <AdminSectionCard title="United States Nexus Map">
      <div
        ref={containerRef}
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={clearHover}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          className="h-full w-full"
          style={{ maxHeight: "560px" }}
          ref={(node: SVGSVGElement | null) => {
            svgRef.current = node;
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
                    stroke="#ddd7cc"
                    strokeWidth={0.8}
                    style={{
                      default: {
                        outline: "none",
                        transition:
                          "transform 160ms ease, filter 160ms ease, opacity 160ms ease",
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
                        filter: "drop-shadow(0px 3px 8px rgba(17,17,17,0.18))",
                        opacity: 0.96,
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      handleStateMouseEnter(
                        stateCode,
                        e.currentTarget as unknown as SVGPathElement,
                      );
                    }}
                    onMouseLeave={clearHover}
                    onClick={() => {
                      if (stateData) {
                        onStateClick(stateData);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {hoveredData && anchor && tooltipPos && (
          <div className="pointer-events-none absolute inset-0 z-50">
            <div
              className="absolute rounded-full border border-brand-text/40 bg-brand-text/10 shadow-sm"
              style={{ left: anchor.x - 4, top: anchor.y - 4, width: 8, height: 8 }}
            />

            <div
              className="absolute transition-all duration-150 ease-out"
              style={{ left: tooltipPos.left, top: tooltipPos.top, width: tooltipWidth }}
            >
              <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_40px_rgba(17,17,17,0.12)]">
                <div className="mb-2 text-lg font-bold text-brand-text">
                  {hoveredData.stateName} ({hoveredData.stateCode})
                </div>

                <div className="space-y-1 text-sm text-brand-muted">
                  <div>Sales: {formatCurrency(hoveredData.relevantSales)}</div>
                  <div>Threshold: {formatCurrency(hoveredData.threshold)}</div>
                  <div className="pt-1 font-semibold text-brand-text">
                    {hoveredData.percentageToThreshold.toFixed(1)}% to threshold
                  </div>

                  {hoveredData.isRegistered && (
                    <div className="pt-1 text-xs text-emerald-700">Registered</div>
                  )}
                  {hoveredData.isHomeState && (
                    <div className="pt-1 text-xs text-amber-700">Home Office State</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-1 sm:flex sm:flex-nowrap sm:items-center sm:gap-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex min-w-0 items-center gap-1.5">
              <div
                className="h-2 w-2 shrink-0 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="whitespace-nowrap text-[9px] leading-none tracking-tight text-brand-muted">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminSectionCard>
  );
}
