import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  height?: number;
}

export const TreemapChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-xs text-slate-400">Nenhum dado.</div>;

  const totalValue = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="w-full flex flex-col justify-between py-2 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 w-full">
        {sorted.map((item, index) => {
          const pct = (item.value / totalValue) * 100;
          const isHovered = hoveredIndex === index;
          const color = item.color || palette.colors[index % palette.colors.length];
          const isTopItem = index === 0;

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group min-w-0 ${
                isTopItem ? 'sm:col-span-2' : ''
              } ${
                isHovered ? 'scale-[1.01] shadow-lg brightness-110 z-10' : 'hover:border-slate-600'
              } ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
              style={{ borderLeftWidth: '5px', borderLeftColor: color }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-10 blur-xl" style={{ backgroundColor: color }} />
              <div className="flex items-start justify-between gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.label}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums" style={{ backgroundColor: `${color}20`, color }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-baseline justify-between gap-2 min-w-0">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono tabular-nums truncate">
                  {item.formattedValue || item.value}
                </span>
                {item.secondaryValue && (
                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{item.secondaryValue}</span>
                )}
              </div>
              {item.meta && <div className="text-[10px] text-slate-400 mt-1 truncate">{item.meta}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
