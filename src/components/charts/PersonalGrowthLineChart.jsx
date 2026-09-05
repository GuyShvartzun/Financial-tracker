import React, { useMemo } from 'react';
import { getAccountTotalsForMonth } from '../../utils/calculations';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function PersonalGrowthLineChart({ userId, monthsList, currentNetWorth, currentLiquid, accounts, isSingleMember = false }) {
  const { isPrivacyMode } = usePrivacy();
  const chartData = useMemo(() => {
    return monthsList.map(m => {
      const userAccs = (isSingleMember || !userId) ? accounts : accounts.filter(a => a.ownerId === userId);
      const totals = getAccountTotalsForMonth(userAccs, m);
      return { month: m, total: totals.netWorth, liquid: totals.liquid };
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
    return { x, y, val: d.total, month: d.month };
  });

  const pointsLiquid = chartData.map((d, i) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = padding + (i / divisor) * (width - padding * 2);
    const y = height - padding - ((d.liquid - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
    return { x, y, val: d.liquid, month: d.month };
  });

  const pathTotal = pointsTotal.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const pathLiquid = pointsLiquid.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-6 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900">
            {isSingleMember ? 'התפתחות ההון לאורך החודשים' : 'התפתחות אישית לאורך החודשים'}
          </h3>
          <p className="text-xs text-stone-500">מעקב היסטורי של סך ההון וההון הנזיל על גבי ציר הזמן</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2E7D32]"></span>
            <span className="text-stone-700">סך הון נטו</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1976D2]"></span>
            <span className="text-stone-700">הון נזיל</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className={`min-w-[500px] transition-all duration-200 ${isPrivacyMode ? 'privacy-chart' : ''}`}>
          <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-auto overflow-visible ${isPrivacyMode ? 'privacy-chart' : ''}`}>
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

            {/* Total Line & Liquid Line & Points wrapped in privacy-blur */}
            <g className="privacy-blur">
              {pointsTotal.length > 1 && (
                <path d={pathTotal} fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {pointsLiquid.length > 1 && (
                <path d={pathLiquid} fill="none" stroke="#1976D2" strokeWidth="2.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Points & Labels */}
              {pointsTotal.map((p, i) => (
                <g key={`total-${i}`} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="2.5" />
                  <title>{isPrivacyMode ? `חודש: ${p.month} | [מוסתר במצב פרטיות]` : `חודש: ${p.month} | סך הון: ${fmtILS(p.val)}`}</title>
                </g>
              ))}

              {pointsLiquid.map((p, i) => (
                <g key={`liquid-${i}`} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke="#1976D2" strokeWidth="2" />
                  <title>{isPrivacyMode ? `חודש: ${p.month} | [מוסתר במצב פרטיות]` : `חודש: ${p.month} | הון נזיל: ${fmtILS(p.val)}`}</title>
                </g>
              ))}
            </g>

            {/* X-axis Month Labels (Non-sensitive dates) */}
            {pointsTotal.map((p, i) => (
              <text key={`month-lbl-${i}`} x={p.x} y={height - 10} fill="#78716C" fontSize="10" fontWeight="bold" textAnchor="middle">
                {p.month}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
