import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  height?: number;
}

export const FunnelChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return (
      <div className={`h-48 flex items-center justify-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Nenhum dado.
      </div>
    );
  }

  const initialValue = data[0].value || 1;

  return (
    <div className="flex flex-col justify-center items-center gap-2.5 w-full py-2 min-w-0">
      {data.map((item, index) => {
        const pctOfTop = (item.value / initialValue) * 100;
        const prevItem = index > 0 ? data[index - 1] : null;
        const stepConversion = prevItem && prevItem.value > 0 ? ((item.value / prevItem.value) * 100).toFixed(0) : null;
        const isHovered = hoveredIndex === index;
        const color = item.color || palette.colors[index % palette.colors.length];

        return (
          <div
            key={item.label}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="w-full flex flex-col items-center group cursor-pointer min-w-0"
          >
            {stepConversion && (
              <div
                className={`text-[10px] font-mono -my-1 z-10 px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-sm transition-colors ${
                  isDarkMode
                    ? 'bg-slate-900/90 text-slate-300 border-slate-700/60'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                <span>↓ {stepConversion}% de conversão</span>
              </div>
            )}
            <div
              className={`rounded-xl transition-all duration-300 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-sm min-w-[240px] max-w-full ${
                isHovered ? 'scale-[1.02] brightness-110 shadow-md' : 'hover:brightness-105'
              }`}
              style={{ width: `${Math.max(pctOfTop, 60)}%`, backgroundColor: color, color: '#ffffff' }}
            >
              <div className="flex items-center gap-2 min-w-0 truncate mr-2">
                <span className="w-5 h-5 rounded-full bg-black/25 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs font-bold truncate drop-shadow-sm">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <span className="text-xs font-mono font-black drop-shadow-sm tabular-nums">
                  {item.formattedValue || item.value}
                </span>
                <span className="text-[10px] text-white/90 font-bold tabular-nums">({pctOfTop.toFixed(0)}%)</span>
              </div>
            </div>
            {item.meta && (
              <div
                className={`text-[10px] font-medium mt-1 truncate max-w-full px-2 transition-opacity ${
                  isHovered
                    ? isDarkMode
                      ? 'opacity-100 text-emerald-400'
                      : 'opacity-100 text-emerald-600'
                    : isDarkMode
                    ? 'opacity-70 text-slate-400'
                    : 'opacity-70 text-slate-500'
                }`}
              >
                {item.meta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};