// src/components/admin/USMap.tsx

"use client";

import { useState } from "react";

type StateSummary = {
  stateCode: string;
  stateName: string;
  threshold: number;
  thresholdType: string;
  window: string;
  totalSales: number;
  taxableSales: number;
  transactionCount: number;
  relevantSales: number;
  percentageToThreshold: number;
  isRegistered: boolean;
  nexusType: 'physical' | 'economic';
  isHomeState: boolean;
  taxable: boolean;
};

type USMapProps = {
  states: StateSummary[];
  onStateClick: (state: StateSummary) => void;
  getStateColor: (state: StateSummary) => string;
  formatCurrency: (val: number) => string;
};

export function USMap({ states, onStateClick, getStateColor, formatCurrency }: USMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const stateMap = states.reduce((acc, state) => {
    acc[state.stateCode] = state;
    return acc;
  }, {} as Record<string, StateSummary>);

  const hovered = hoveredState ? stateMap[hoveredState] : null;

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
      <svg
        viewBox="0 0 959 593"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* State paths - simplified US map */}
        <g id="states">
          {/* Alabama */}
          <path
            d="M 680 400 L 710 380 L 720 420 L 690 440 Z"
            fill={getStateColor(stateMap.AL)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('AL')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.AL)}
          />
          {/* Alaska (inset) */}
          <path
            d="M 100 500 L 200 480 L 180 550 L 80 540 Z"
            fill={getStateColor(stateMap.AK)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('AK')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.AK)}
          />
          {/* Arizona */}
          <path
            d="M 150 300 L 220 290 L 230 380 L 160 390 Z"
            fill={getStateColor(stateMap.AZ)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('AZ')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.AZ)}
          />
          {/* Arkansas */}
          <path
            d="M 580 340 L 640 330 L 650 380 L 590 390 Z"
            fill={getStateColor(stateMap.AR)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('AR')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.AR)}
          />
          {/* California */}
          <path
            d="M 80 200 L 150 180 L 160 320 L 90 340 Z"
            fill={getStateColor(stateMap.CA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('CA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.CA)}
          />
          {/* Colorado */}
          <path
            d="M 300 220 L 400 210 L 410 290 L 310 300 Z"
            fill={getStateColor(stateMap.CO)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('CO')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.CO)}
          />
          {/* Connecticut */}
          <path
            d="M 850 170 L 870 165 L 875 185 L 855 190 Z"
            fill={getStateColor(stateMap.CT)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('CT')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.CT)}
          />
          {/* Delaware */}
          <path
            d="M 830 240 L 840 235 L 845 255 L 835 260 Z"
            fill={getStateColor(stateMap.DE)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('DE')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.DE)}
          />
          {/* Florida */}
          <path
            d="M 750 450 L 800 430 L 820 500 L 770 520 Z"
            fill={getStateColor(stateMap.FL)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('FL')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.FL)}
          />
          {/* Georgia */}
          <path
            d="M 710 380 L 760 360 L 780 420 L 730 440 Z"
            fill={getStateColor(stateMap.GA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('GA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.GA)}
          />
          {/* Hawaii (inset) */}
          <path
            d="M 220 520 L 280 510 L 290 550 L 230 560 Z"
            fill={getStateColor(stateMap.HI)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('HI')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.HI)}
          />
          {/* Idaho */}
          <path
            d="M 180 100 L 240 90 L 250 180 L 190 190 Z"
            fill={getStateColor(stateMap.ID)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('ID')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.ID)}
          />
          {/* Illinois */}
          <path
            d="M 630 240 L 670 230 L 680 310 L 640 320 Z"
            fill={getStateColor(stateMap.IL)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('IL')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.IL)}
          />
          {/* Indiana */}
          <path
            d="M 670 230 L 710 220 L 720 290 L 680 300 Z"
            fill={getStateColor(stateMap.IN)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('IN')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.IN)}
          />
          {/* Iowa */}
          <path
            d="M 560 200 L 630 190 L 640 250 L 570 260 Z"
            fill={getStateColor(stateMap.IA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('IA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.IA)}
          />
          {/* Kansas */}
          <path
            d="M 420 280 L 550 270 L 560 330 L 430 340 Z"
            fill={getStateColor(stateMap.KS)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('KS')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.KS)}
          />
          {/* Kentucky */}
          <path
            d="M 680 300 L 750 290 L 760 330 L 690 340 Z"
            fill={getStateColor(stateMap.KY)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('KY')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.KY)}
          />
          {/* Louisiana */}
          <path
            d="M 600 420 L 670 410 L 680 470 L 610 480 Z"
            fill={getStateColor(stateMap.LA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('LA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.LA)}
          />
          {/* Maine */}
          <path
            d="M 870 80 L 900 70 L 910 130 L 880 140 Z"
            fill={getStateColor(stateMap.ME)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('ME')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.ME)}
          />
          {/* Maryland */}
          <path
            d="M 800 240 L 830 235 L 835 265 L 805 270 Z"
            fill={getStateColor(stateMap.MD)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MD')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MD)}
          />
          {/* Massachusetts */}
          <path
            d="M 840 150 L 870 145 L 875 170 L 845 175 Z"
            fill={getStateColor(stateMap.MA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MA)}
          />
          {/* Michigan */}
          <path
            d="M 680 150 L 730 140 L 740 210 L 690 220 Z"
            fill={getStateColor(stateMap.MI)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MI')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MI)}
          />
          {/* Minnesota */}
          <path
            d="M 550 100 L 620 90 L 630 180 L 560 190 Z"
            fill={getStateColor(stateMap.MN)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MN')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MN)}
          />
          {/* Mississippi */}
          <path
            d="M 640 380 L 680 370 L 690 430 L 650 440 Z"
            fill={getStateColor(stateMap.MS)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MS')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MS)}
          />
          {/* Missouri */}
          <path
            d="M 570 260 L 640 250 L 650 330 L 580 340 Z"
            fill={getStateColor(stateMap.MO)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MO')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MO)}
          />
          {/* Montana */}
          <path
            d="M 250 90 L 380 80 L 390 150 L 260 160 Z"
            fill={getStateColor(stateMap.MT)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('MT')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.MT)}
          />
          {/* Nebraska */}
          <path
            d="M 420 210 L 550 200 L 560 260 L 430 270 Z"
            fill={getStateColor(stateMap.NE)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NE')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NE)}
          />
          {/* Nevada */}
          <path
            d="M 120 180 L 180 170 L 190 280 L 130 290 Z"
            fill={getStateColor(stateMap.NV)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NV')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NV)}
          />
          {/* New Hampshire */}
          <path
            d="M 860 120 L 880 115 L 885 150 L 865 155 Z"
            fill={getStateColor(stateMap.NH)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NH')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NH)}
          />
          {/* New Jersey */}
          <path
            d="M 840 210 L 860 205 L 865 240 L 845 245 Z"
            fill={getStateColor(stateMap.NJ)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NJ')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NJ)}
          />
          {/* New Mexico */}
          <path
            d="M 240 300 L 310 290 L 320 390 L 250 400 Z"
            fill={getStateColor(stateMap.NM)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NM')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NM)}
          />
          {/* New York */}
          <path
            d="M 790 160 L 850 150 L 860 210 L 800 220 Z"
            fill={getStateColor(stateMap.NY)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NY')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NY)}
          />
          {/* North Carolina */}
          <path
            d="M 760 320 L 830 310 L 840 360 L 770 370 Z"
            fill={getStateColor(stateMap.NC)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('NC')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.NC)}
          />
          {/* North Dakota */}
          <path
            d="M 410 80 L 540 70 L 550 140 L 420 150 Z"
            fill={getStateColor(stateMap.ND)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('ND')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.ND)}
          />
          {/* Ohio */}
          <path
            d="M 710 220 L 760 210 L 770 280 L 720 290 Z"
            fill={getStateColor(stateMap.OH)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('OH')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.OH)}
          />
          {/* Oklahoma */}
          <path
            d="M 430 340 L 560 330 L 570 390 L 440 400 Z"
            fill={getStateColor(stateMap.OK)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('OK')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.OK)}
          />
          {/* Oregon */}
          <path
            d="M 90 120 L 180 110 L 190 190 L 100 200 Z"
            fill={getStateColor(stateMap.OR)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('OR')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.OR)}
          />
          {/* Pennsylvania */}
          <path
            d="M 760 210 L 820 200 L 830 250 L 770 260 Z"
            fill={getStateColor(stateMap.PA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('PA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.PA)}
          />
          {/* Rhode Island */}
          <path
            d="M 865 165 L 875 163 L 878 175 L 868 177 Z"
            fill={getStateColor(stateMap.RI)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('RI')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.RI)}
          />
          {/* South Carolina */}
          <path
            d="M 750 350 L 790 340 L 800 390 L 760 400 Z"
            fill={getStateColor(stateMap.SC)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('SC')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.SC)}
          />
          {/* South Dakota */}
          <path
            d="M 410 150 L 540 140 L 550 200 L 420 210 Z"
            fill={getStateColor(stateMap.SD)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('SD')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.SD)}
          />
          {/* Tennessee */}
          <path
            d="M 650 330 L 750 320 L 760 370 L 660 380 Z"
            fill={getStateColor(stateMap.TN)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('TN')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.TN)}
          />
          {/* Texas */}
          <path
            d="M 350 400 L 570 390 L 590 500 L 370 510 Z"
            fill={getStateColor(stateMap.TX)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('TX')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.TX)}
          />
          {/* Utah */}
          <path
            d="M 220 220 L 290 210 L 300 320 L 230 330 Z"
            fill={getStateColor(stateMap.UT)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('UT')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.UT)}
          />
          {/* Vermont */}
          <path
            d="M 850 110 L 865 105 L 870 140 L 855 145 Z"
            fill={getStateColor(stateMap.VT)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('VT')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.VT)}
          />
          {/* Virginia */}
          <path
            d="M 760 270 L 820 260 L 830 310 L 770 320 Z"
            fill={getStateColor(stateMap.VA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('VA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.VA)}
          />
          {/* Washington */}
          <path
            d="M 90 60 L 180 50 L 190 110 L 100 120 Z"
            fill={getStateColor(stateMap.WA)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('WA')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.WA)}
          />
          {/* West Virginia */}
          <path
            d="M 740 250 L 780 240 L 790 290 L 750 300 Z"
            fill={getStateColor(stateMap.WV)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('WV')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.WV)}
          />
          {/* Wisconsin */}
          <path
            d="M 630 140 L 680 130 L 690 200 L 640 210 Z"
            fill={getStateColor(stateMap.WI)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('WI')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.WI)}
          />
          {/* Wyoming */}
          <path
            d="M 290 150 L 400 140 L 410 210 L 300 220 Z"
            fill={getStateColor(stateMap.WY)}
            stroke="#000"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setHoveredState('WY')}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onStateClick(stateMap.WY)}
          />
        </g>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-4 right-4 bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl z-10 min-w-[250px]">
          <div className="font-bold mb-2 text-white text-lg">{hovered.stateName}</div>
          <div className="text-sm space-y-1 text-gray-300">
            <div>Sales: {formatCurrency(hovered.relevantSales)}</div>
            <div>Threshold: {formatCurrency(hovered.threshold)}</div>
            <div className="font-semibold text-white pt-1">
              {hovered.percentageToThreshold.toFixed(1)}% to threshold
            </div>
            {hovered.isRegistered && (
              <div className="text-green-400 text-xs pt-1">✓ Registered</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}