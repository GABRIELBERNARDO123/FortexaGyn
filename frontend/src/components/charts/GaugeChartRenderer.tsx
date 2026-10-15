import React, { useState, useMemo } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[]; palette: ColorPalette; isDarkMode: boolean;
  min?: number; max?: number; unit?: string; height?: number; centerPointer?: boolean;
}

export const GaugeChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode, min = 0, max = 100, unit = '%' }) => {
  const primaryItem = data && data.length > 0 ? data[0] : { label: 'Meta', value: 75 };
  const rawValue = primaryItem.value;
  const clampedDataValue = Math.min(Math.max(rawValue, min), max);
  const dataPercentage = max > min ? ((clampedDataValue - min) / (max - min)) * 100 : 0;

  const [hoveredPercentage, setHoveredPercentage] = useState<number | null>(null);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);

  const activePercentage = useMemo(() => {
    if (hoveredPercentage !== null) return hoveredPercentage;
    if (hoveredItemIndex !== null && data[hoveredItemIndex]) {
      const itemVal = data[hoveredItemIndex].value;
      const clamped = Math.min(Math.max(itemVal, min), max);
      return max > min ? ((clamped - min) / (max - min)) * 100 : 0;
    }
    return dataPercentage;
  }, [hoveredPercentage, hoveredItemIndex, dataPercentage, data, min, max]);

  const activeValue = useMemo(() => {
    if (hoveredPercentage !== null) return min + (hoveredPercentage / 100) * (max - min);
    if (hoveredItemIndex !== null && data[hoveredItemIndex]) return data[hoveredItemIndex].value;
    return clampedDataValue;
  }, [hoveredPercentage, hoveredItemIndex, clampedDataValue, data, min, max]);

  const activeFormattedValue = useMemo(() => {
    if (hoveredPercentage !== null) return `${Math.round(activeValue)}${unit}`;
    if (hoveredItemIndex !== null && data[hoveredItemIndex]) return data[hoveredItemIndex].formattedValue || `${Math.round(activeValue)}${unit}`;
    return primaryItem.formattedValue || `${Math.round(activeValue)}${unit}`;
  }, [hoveredPercentage, hoveredItemIndex, activeValue, primaryItem, unit]);

  const activeLabel = useMemo(() => {
    if (hoveredPercentage !== null) return `Simulação: ${Math.round(activePercentage)}%`;
    if (hoveredItemIndex !== null && data[hoveredItemIndex]) return data[hoveredItemIndex].label;
    return primaryItem.label;
  }, [hoveredPercentage, hoveredItemIndex, activePercentage, primaryItem]);

  const size = 260, cx = 130, cy = 112, radius = 82, strokeWidth = 14;
  const bgArcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const endDeg = -180 + (activePercentage / 100) * 180;
  const endRad = (endDeg * Math.PI) / 180;
  const valX = cx + radius * Math.cos(endRad), valY = cy + radius * Math.sin(endRad);
  const valArcPath = activePercentage > 0.1 ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${valX} ${valY}` : '';
  const needleRotation = -90 + (activePercentage / 100) * 180;

  const majorTicks = [0, 25, 50, 75, 100];
  const minorTicks = [10, 20, 30, 40, 60, 70, 80, 90];

  let statusText = 'Regular';
  let statusBadgeColor = 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20';
  if (activePercentage >= 85) { statusText = 'Excelente'; statusBadgeColor = 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'; }
  else if (activePercentage >= 70) { statusText = 'Ótimo'; statusBadgeColor = 'text-sky-700 bg-sky-100 border-sky-300 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20'; }
  else if (activePercentage < 50) { statusText = 'Atenção'; statusBadgeColor = 'text-rose-700 bg-rose-100 border-rose-300 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20'; }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const svgX = (px / rect.width) * size, svgY = (py / rect.height) * 175;
    const dx = svgX - cx, dy = svgY - cy;
    if (dy <= 20) {
      let angle = Math.atan2(dy, dx);
      if (angle > 0) angle = dx >= 0 ? 0 : -Math.PI;
      const pct = Math.max(0, Math.min(100, ((angle + Math.PI) / Math.PI) * 100));
      setHoveredPercentage(pct);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-2 min-w-0">
      <div className="relative flex flex-col items-center w-full max-w-[270px]" title="Passe o cursor sobre o mostrador">
        <svg viewBox={`0 0 ${size} 175`} className="w-full h-auto overflow-visible select-none cursor-pointer" onPointerMove={handlePointerMove} onPointerLeave={() => setHoveredPercentage(null)}>
          <defs>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={palette.primaryHex} floodOpacity="0.28" />
            </filter>
          </defs>
          <path d={bgArcPath} fill="none" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} strokeWidth={strokeWidth} strokeLinecap="round" />
          {minorTicks.map((tick) => {
            const rad = ((-180 + (tick / 100) * 180) * Math.PI) / 180;
            const x1 = cx + (radius - 9) * Math.cos(rad), y1 = cy + (radius - 9) * Math.sin(rad);
            const x2 = cx + (radius - 3) * Math.cos(rad), y2 = cy + (radius - 3) * Math.sin(rad);
            return <line key={`minor-${tick}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isDarkMode ? '#334155' : '#cbd5e1'} strokeWidth="1.2" strokeLinecap="round" />;
          })}
          {majorTicks.map((tick) => {
            const rad = ((-180 + (tick / 100) * 180) * Math.PI) / 180;
            const x1 = cx + (radius - 14) * Math.cos(rad), y1 = cy + (radius - 14) * Math.sin(rad);
            const x2 = cx + (radius - 2) * Math.cos(rad), y2 = cy + (radius - 2) * Math.sin(rad);
            const isCenterPlumb = tick === 50;
            return <line key={`major-${tick}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isCenterPlumb ? (isDarkMode ? '#94a3b8' : '#64748b') : (isDarkMode ? '#475569' : '#94a3b8')} strokeWidth={isCenterPlumb ? '2' : '1.5'} strokeLinecap="round" />;
          })}
          {activePercentage > 0.1 && <path d={valArcPath} fill="none" stroke={palette.primaryHex} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#gaugeGlow)" className="transition-all duration-300 ease-out" />}
          <g transform={`rotate(${needleRotation} ${cx} ${cy})`} style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box', transition: hoveredPercentage !== null ? 'transform 0.05s ease-out' : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <polygon points={`${cx - 3.5},${cy + 4} ${cx - 1},${cy - radius + 12} ${cx},${cy - radius + 6} ${cx + 1},${cy - radius + 12} ${cx + 3.5},${cy + 4}`} fill={isDarkMode ? '#ffffff' : '#0f172a'} />
            <line x1={cx} y1={cy - radius + 8} x2={cx} y2={cy} stroke={palette.primaryHex} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={7.5} fill={isDarkMode ? '#0f172a' : '#ffffff'} stroke={palette.primaryHex} strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r={3} fill={isDarkMode ? '#ffffff' : '#0f172a'} />
          </g>
          <text x={cx - radius} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isDarkMode ? '#64748b' : '#64748b'}>{min}{unit}</text>
          <text x={cx} y={cy - radius - 10} textAnchor="middle" fontSize="9" fontWeight="600" fill={isDarkMode ? '#475569' : '#64748b'}>{Math.round((min + max) / 2)}{unit}</text>
          <text x={cx + radius} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isDarkMode ? '#64748b' : '#64748b'}>{max}{unit}</text>
          <text x={cx} y={152} textAnchor="middle" fontSize="28" fontWeight="900" fill={isDarkMode ? '#f8fafc' : '#0f172a'} className="font-mono tracking-tight select-none">{activeFormattedValue}</text>
        </svg>
        <div className="text-center mt-1 space-y-1 w-full">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate max-w-full px-2">{activeLabel}</p>
          <div className="pt-0.5">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeColor} transition-colors duration-200`}>{statusText}</span>
          </div>
        </div>
      </div>
      {data.length > 1 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          {data.slice(1, 5).map((item, idx) => {
            const isHovered = hoveredItemIndex === idx + 1;
            return (
              <div key={item.label} onMouseEnter={() => setHoveredItemIndex(idx + 1)} onMouseLeave={() => setHoveredItemIndex(null)} className={`p-1.5 px-2.5 rounded-lg flex items-center justify-between min-w-0 transition-all cursor-pointer ${isHovered ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-800'}`} title="Passe o mouse para ver no velocímetro">
                <span className="text-slate-600 dark:text-slate-400 truncate text-[11px] mr-2">{item.label}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 tabular-nums">{item.formattedValue || item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};