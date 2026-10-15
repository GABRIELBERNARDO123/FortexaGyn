import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface BarChartRendererProps {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  orientation?: 'vertical' | 'horizontal';
  height?: number;
}

export const BarChartRenderer: React.FC<BarChartRendererProps> = ({
  data, palette, isDarkMode, orientation, height = 260,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-slate-400">Nenhum dado disponível.</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((acc, d) => acc + d.value, 0);
  const isHorizontal = orientation === 'horizontal' || data.length > 5;

  if (isHorizontal) {
    return (
      <div className="space-y-3 py-1 w-full min-w-0">
        {data.map((item, index) => {
          const pct = (item.value / maxValue) * 100;
          const pctTotal = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
          const barColor = item.color || palette.colors[index % palette.colors.length];
          const isHovered = hoveredIndex === index;
          return (
            <div key={item.label} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} className="space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                  <span className={`font-semibold truncate ${isHovered ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{item.formattedValue || item.value}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">({pctTotal.toFixed(0)}%)</span>
                </div>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: barColor }} className="h-full rounded-full transition-all duration-500" />
              </div>
              {item.meta && <div className="text-[10px] text-slate-400 pl-4.5 truncate">{item.meta}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col justify-end min-w-0" style={{ height }}>
      <div className="absolute inset-x-0 inset-y-4 flex flex-col justify-between pointer-events-none opacity-20">
        <div className="border-b border-slate-500 w-full" />
        <div className="border-b border-slate-500 w-full" />
        <div className="border-b border-slate-500 w-full" />
        <div className="border-b border-slate-500 w-full" />
      </div>
      <div className="relative z-10 flex items-end justify-between gap-1.5 h-full pt-8 pb-7 px-1 w-full min-w-0">
        {data.map((item, index) => {
          const heightPct = (item.value / maxValue) * 100;
          const barColor = item.color || palette.colors[index % palette.colors.length];
          const isHovered = hoveredIndex === index;
          return (
            <div key={item.label} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} className="flex-1 min-w-0 max-w-[70px] flex flex-col items-center h-full justify-end group cursor-pointer">
              <span className={`text-[9px] font-mono font-bold mb-1 ${isHovered ? 'opacity-100 text-emerald-400' : 'opacity-75 text-slate-400'}`}>
                {item.secondaryValue || (item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : item.value)}
              </span>
              <div className={`w-full rounded-t-xl transition-all duration-300 ${isHovered ? 'brightness-125 shadow-lg scale-y-[1.02]' : ''}`}
                style={{ height: `${Math.max(heightPct, 6)}%`, background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}cc 100%)` }} />
              <span className={`text-[9px] font-medium mt-1.5 truncate w-full text-center ${isHovered ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`} title={item.label}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
