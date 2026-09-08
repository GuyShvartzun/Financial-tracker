import React, { useMemo, useState } from 'react';
import { getAccountTotalsForMonth } from '../../utils/calculations';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function PersonalGrowthLineChart({ userId, monthsList, currentNetWorth, currentLiquid, accounts, isSingleMember = false, isPrivacyMode: propPrivacy }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const chartData = useMemo(() => {
    return monthsList.map((m, idx) => {
      const userAccs = (isSingleMember || !userId) ? accounts : accounts.filter(a => a.ownerId === userId);
      const totals = getAccountTotalsForMonth(userAccs, m);
      return { 
        month: m, 
        total: totals.netWorth, 
        liquid: totals.liquid,
        idx 
      };
    });
  }, [userId, monthsList, accounts, isSingleMember]);

  const width = 600;
  const height = 220;
  const padding = 35;

  const allValues = chartData.flatMap(d => [d.total, d.liquid]);
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 0;
  const range = rawMax - rawMin;
  const pad = range === 0 ? (rawMax === 0 ? 100 : rawMax * 0.05) : range * 0.1;
  const minVal = Math.max(0, Math.floor(rawMin - pad));
  const maxVal = Math.ceil(rawMax + pad);

  const pointsTotal = chartData.map((d, i) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = padding + (i / divisor) * (width - padding * 2);
    const y = height - padding - ((d.total - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
    return { x, y, val: d.total, month: d.month, idx: i };
  });

  const pointsLiquid = chartData.map((d, i) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = padding + (i / divisor) * (width - padding * 2);
    const y = height - padding - ((d.liquid - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
    return { x, y, val: d.liquid, month: d.month, idx: i };
  });

  const pathTotal = pointsTotal.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathLiquid = pointsLiquid.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  // Area under curve paths
  const baselineY = height - padding;
  const firstX = pointsTotal[0]?.x ?? padding;
  const lastX = pointsTotal[pointsTotal.length - 1]?.x ?? (width - padding);
  const pathTotalArea = pointsTotal.length > 1
    ? `${pathTotal} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
    : '';

  const activePoint = hoveredIdx !== null ? pointsTotal[hoveredIdx] : null;
  const activeLiquidPoint = hoveredIdx !== null ? pointsLiquid[hoveredIdx] : null;

  // Previous month delta
  const prevPoint = (hoveredIdx !== null && hoveredIdx > 0) ? pointsTotal[hoveredIdx - 1] : null;
  const deltaTotal = (activePoint && prevPoint) ? activePoint.val - prevPoint.val : null;

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] border border-[#E8E2D8] dark:border-stone-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4 relative transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {isSingleMember ? 'התפתחות ההון לאורך החודשים' : 'התפתחות אישית לאורך החודשים'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">מעקב היסטורי של סך ההון וההון הנזיל על גבי ציר הזמן</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2E7D32] dark:bg-emerald-500"></span>
            <span className="text-stone-700 dark:text-stone-300">סך הון נטו</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1976D2] dark:bg-blue-400"></span>
            <span className="text-stone-700 dark:text-stone-300">הון נזיל</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto relative">
        <div className={`min-w-[500px] transition-all duration-200 ${isPrivacyMode ? 'privacy-chart' : ''}`}>
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className={`w-full h-auto overflow-visible select-none ${isPrivacyMode ? 'privacy-chart' : ''}`}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="totalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="liquidAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1976D2" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#1976D2" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding + ratio * (height - padding * 2);
              const val = Math.round(maxVal - ratio * (maxVal - minVal));
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#F2ECE1" strokeDasharray="3 3" />
                  <text x={width - padding + 5} y={y + 3} fill="#A8A29E" fontSize="9" textAnchor="start" className="privacy-blur">
                    {fmtILS(val, isPrivacyMode)}
                  </text>
                </g>
              );
            })}

            {/* Area under curve fill */}
            {pathTotalArea && (
              <path d={pathTotalArea} fill="url(#totalAreaGradient)" />
            )}

            {/* Total Line & Liquid Line */}
            <g className="privacy-blur">
              {pointsTotal.length > 1 && (
                <path d={pathTotal} fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-draw-line" />
              )}

              {pointsLiquid.length > 1 && (
                <path d={pathLiquid} fill="none" stroke="#1976D2" strokeWidth="2.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" className="animate-draw-line" />
              )}

              {/* Hover vertical line guide */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={padding}
                  x2={activePoint.x}
                  y2={height - padding}
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Total points */}
              {pointsTotal.map((p, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <g 
                    key={`total-${i}`} 
                    className="group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
                  >
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? "6" : "4"} 
                      fill="#FFFFFF" 
                      stroke="#2E7D32" 
                      strokeWidth={isHovered ? "3.5" : "2.5"} 
                      className="transition-all duration-150"
                    />
                    <title>{isPrivacyMode ? `חודש: ${p.month} | [מוסתר במצב פרטיות]` : `חודש: ${p.month} | סך הון: ${fmtILS(p.val)}`}</title>
                  </g>
                );
              })}

              {/* Liquid points */}
              {pointsLiquid.map((p, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <g 
                    key={`liquid-${i}`} 
                    className="group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
                  >
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? "5" : "3.5"} 
                      fill="#FFFFFF" 
                      stroke="#1976D2" 
                      strokeWidth={isHovered ? "3" : "2"} 
                      className="transition-all duration-150"
                    />
                    <title>{isPrivacyMode ? `חודש: ${p.month} | [מוסתר במצב פרטיות]` : `חודש: ${p.month} | הון נזיל: ${fmtILS(p.val)}`}</title>
                  </g>
                );
              })}
            </g>

            {/* X-axis Month Labels */}
            {pointsTotal.map((p, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <text 
                  key={`month-lbl-${i}`} 
                  x={p.x} 
                  y={height - 10} 
                  fill={isHovered ? "#166534" : "#78716C"} 
                  fontSize={isHovered ? "11" : "10"} 
                  fontWeight="bold" 
                  textAnchor="middle"
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
                >
                  {p.month}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Rich Floating Interactive Tooltip */}
        {activePoint && (
          <div 
            className="absolute z-20 pointer-events-none bg-white/95 dark:bg-[#1E2230]/95 backdrop-blur-md border border-[#C8E6C9] dark:border-emerald-800/60 p-2.5 sm:p-3 rounded-xl shadow-xl text-xs space-y-1 min-w-[140px] text-right font-sans transition-all duration-150 animate-in fade-in zoom-in-95"
            style={{
              top: '12px',
              left: activePoint.x > width / 2 ? '16px' : 'auto',
              right: activePoint.x <= width / 2 ? '16px' : 'auto',
            }}
            dir="rtl"
          >
            <div className="font-black text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-1 flex items-center justify-between">
              <span>חודש: {activePoint.month}</span>
              {deltaTotal !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  deltaTotal >= 0 
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' 
                    : 'text-red-700 bg-red-50 dark:bg-red-950/40'
                }`}>
                  {deltaTotal >= 0 ? `+${fmtILS(deltaTotal, isPrivacyMode)}` : fmtILS(deltaTotal, isPrivacyMode)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-stone-500 dark:text-stone-400">סך הון נטו:</span>
              <strong className="text-[#2E7D32] dark:text-emerald-400 font-black privacy-blur">
                {fmtILS(activePoint.val, isPrivacyMode)}
              </strong>
            </div>
            {activeLiquidPoint && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500 dark:text-stone-400">הון נזיל:</span>
                <strong className="text-[#1976D2] dark:text-blue-400 font-bold privacy-blur">
                  {fmtILS(activeLiquidPoint.val, isPrivacyMode)}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
