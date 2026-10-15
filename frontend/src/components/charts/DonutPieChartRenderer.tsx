import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  centerTitle?: string;
  height?: number;
}

export const DonutPieChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode, centerTitle = 'Total' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">Nenhum dado disponível.</div>;

  const totalValue = data.reduce((acc, d) => acc + d.value, 0);
  const size = 220, cx = size / 2, cy = size / 2, outerRadius = 86, innerRadius = 52;

  let cumulativeAngle = 0;
  const slices = data.map((item, index) => {
    const sliceAngle = totalValue > 0 ? (item.value / totalValue) * 360 : 360 / data.length;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;
    const sliceColor = item.color || palette.colors[index % palette.colors.length];
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const adjEnd = Math.min(endAngle, startAngle + 359.999);
    const endRad = ((adjEnd - 90) * Math.PI) / 180;
    const x1 = cx + outerRadius * Math.cos(startRad), y1 = cy + outerRadius * Math.sin(startRad);
    const x2 = cx + outerRadius * Math.cos(endRad), y2 = cy + outerRadius * Math.sin(endRad);
    const x3 = cx + innerRadius * Math.cos(endRad), y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad), y4 = cy + innerRadius * Math.sin(startRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return { item, index, sliceColor, pathData, pct: totalValue > 0 ? (item.value / totalValue) * 100 : 0 };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const activePct = hoveredIndex !== null && totalValue > 0 ? ((data[hoveredIndex].value / totalValue) * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full py-2 min-w-0">
      <div className="relative w-[180px] aspect-square shrink-0 flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <path
                key={slice.item.label}
                d={slice.pathData}
                fill={slice.sliceColor}
                stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                strokeWidth="2.5"
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${cx}px ${cy}px`,
                  opacity: hoveredIndex === null || isHovered ? 1 : 0.65
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeItem ? (
            <>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[80px]">
                {activeItem.label}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                {activePct}%
              </span>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[90px]">
                {activeItem.formattedValue || activeItem.value}
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {centerTitle}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                {totalValue > 9999 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue}
              </span>
              <span className="text-[8px] text-slate-500 dark:text-slate-400">{data.length} itens</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-1.5 w-full min-w-0">
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          const sliceColor = item.color || palette.colors[index % palette.colors.length];
          const pct = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-2 px-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                isHovered
                  ? isDarkMode
                    ? 'bg-slate-800/80 border-slate-700'
                    : 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-800/20 border-slate-800/60 hover:border-slate-700'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="w-2.5 h-2.5 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: sliceColor }} />
                <span className={`truncate ${isHovered ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {item.formattedValue || item.value}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};