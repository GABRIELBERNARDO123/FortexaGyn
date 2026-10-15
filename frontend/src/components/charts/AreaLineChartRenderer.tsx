import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  height?: number;
}

export const AreaLineChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode, height = 260 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-xs text-slate-400">Nenhum dado.</div>;

  const svgWidth = 500, svgHeight = 180, paddingX = 35, paddingTop = 20, paddingBottom = 25;
  const chartWidth = svgWidth - paddingX * 2, chartHeight = svgHeight - paddingTop - paddingBottom;
  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1), minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = data.length === 1 ? paddingX + chartWidth / 2 : paddingX + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
    return { x, y, item, index };
  });

  const linePath = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2, cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2, cpY2 = point.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
  }, '');

  const lastPoint = points[points.length - 1], firstPoint = points[0];
  const bottomY = paddingTop + chartHeight;
  const areaPath = `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
  const gradientId = `area-grad-${palette.id}`;

  return (
    <div className="relative w-full flex flex-col justify-between min-w-0" style={{ minHeight: height }}>
      <div className="w-full relative pt-2">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[190px] overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.primaryHex} stopOpacity="0.45" />
              <stop offset="85%" stopColor={palette.primaryHex} stopOpacity="0.03" />
              <stop offset="100%" stopColor={palette.primaryHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line x1={paddingX} y1={paddingTop} x2={svgWidth - paddingX} y2={paddingTop} stroke={isDarkMode ? '#334155' : '#e2e8f0'} strokeDasharray="4 4" strokeWidth="1" />
          <line x1={paddingX} y1={paddingTop + chartHeight / 2} x2={svgWidth - paddingX} y2={paddingTop + chartHeight / 2} stroke={isDarkMode ? '#334155' : '#e2e8f0'} strokeDasharray="4 4" strokeWidth="1" />
          <line x1={paddingX} y1={bottomY} x2={svgWidth - paddingX} y2={bottomY} stroke={isDarkMode ? '#475569' : '#cbd5e1'} strokeWidth="1.2" />
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={palette.primaryHex} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt) => {
            const isHovered = hoveredIndex === pt.index;
            return (
              <g key={pt.item.label} className="cursor-pointer">
                <circle cx={pt.x} cy={pt.y} r="20" fill="transparent" onMouseEnter={() => setHoveredIndex(pt.index)} onMouseLeave={() => setHoveredIndex(null)} />
                <circle cx={pt.x} cy={pt.y} r={isHovered ? 6.5 : 4.5} fill={palette.primaryHex} stroke={isDarkMode ? '#0f172a' : '#ffffff'} strokeWidth={isHovered ? 3 : 2} className="transition-all duration-200" />
                <circle cx={pt.x} cy={bottomY + 14} r="9" fill={isHovered ? palette.primaryHex : (isDarkMode ? '#1e293b' : '#f1f5f9')} stroke={isHovered ? palette.primaryHex : (isDarkMode ? '#334155' : '#cbd5e1')} strokeWidth="1" />
                <text x={pt.x} y={bottomY + 17.5} textAnchor="middle" fontSize="9" fontWeight="bold" fill={isHovered ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b')} className="pointer-events-none select-none">{pt.index + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 w-full text-xs">
        {data.map((item, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div key={item.label} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)} className={`p-1.5 px-2.5 rounded-lg flex items-center justify-between cursor-pointer transition ${isHovered ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-600 dark:text-slate-400'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${isHovered ? 'bg-emerald-500 text-slate-950' : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{idx + 1}</span>
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <span className="font-mono font-bold ml-2 shrink-0 tabular-nums text-slate-900 dark:text-white">{item.formattedValue || item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
