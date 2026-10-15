import React, { useState } from 'react';
import { ChartDataItem, ColorPalette } from './chartTypes';

interface Props {
  data: ChartDataItem[];
  palette: ColorPalette;
  isDarkMode: boolean;
  height?: number;
}

export const RadarChartRenderer: React.FC<Props> = ({ data, palette, isDarkMode }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length < 3) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        O gráfico radar requer pelo menos 3 pilares para renderização.
      </div>
    );
  }

  const size = 380;
  const center = size / 2;
  const radius = 95;
  const numAxes = data.length;
  const levels = [0.25, 0.5, 0.75, 1.0];
  const maxValue = Math.max(...data.map((d) => d.value), 100);

  const getCoordinates = (axisIndex: number, ratio: number) => {
    const angle = ((Math.PI * 2) / numAxes) * axisIndex - Math.PI / 2;
    const r = radius * ratio;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), angle };
  };

  const dataPoints = data.map((item, index) => {
    const ratio = Math.min(Math.max(item.value / maxValue, 0.1), 1.0);
    return getCoordinates(index, ratio);
  });
  const polygonPointsStr = dataPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');

  const gridStroke = isDarkMode ? '#334155' : '#cbd5e1';

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full py-2 min-w-0">
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {levels.map((level) => {
            const ringPoints = Array.from({ length: numAxes })
              .map((_, i) => {
                const pt = getCoordinates(i, level);
                return `${pt.x},${pt.y}`;
              })
              .join(' ');
            return (
              <polygon
                key={level}
                points={ringPoints}
                fill="none"
                stroke={gridStroke}
                strokeWidth={level === 1.0 ? '1.5' : '1'}
                strokeDasharray={level === 1.0 ? 'none' : '3 3'}
              />
            );
          })}
          {Array.from({ length: numAxes }).map((_, i) => {
            const outer = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke={gridStroke}
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={polygonPointsStr}
            fill={palette.primaryHex}
            fillOpacity="0.35"
            stroke={palette.primaryHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {dataPoints.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill={palette.primaryHex}
                  stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                  strokeWidth="2.5"
                  className="transition-transform duration-200"
                />
              </g>
            );
          })}
          {data.map((item, i) => {
            const angle = ((Math.PI * 2) / numAxes) * i - Math.PI / 2;
            const labelRadius = radius + 28;
            const lx = center + labelRadius * Math.cos(angle);
            const ly = center + labelRadius * Math.sin(angle);
            const cosVal = Math.cos(angle);
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            let dy = 4;
            if (cosVal > 0.3) textAnchor = 'start';
            else if (cosVal < -0.3) textAnchor = 'end';
            const sinVal = Math.sin(angle);
            if (sinVal < -0.6) dy = -6;
            else if (sinVal > 0.6) dy = 12;
            const isHovered = hoveredIndex === i;
            return (
              <text
                key={item.label}
                x={lx}
                y={ly + dy}
                textAnchor={textAnchor}
                fontSize="11"
                fontWeight={isHovered ? 'bold' : '600'}
                fill={isHovered ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#94a3b8' : '#475569')}
                className="cursor-pointer transition-colors select-none"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="flex-1 w-full space-y-1.5 min-w-0">
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-2.5 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                isHovered
                  ? isDarkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-100 border-slate-300 shadow-sm'
                  : isDarkMode
                  ? 'border-slate-800/60 bg-slate-800/30'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.primaryHex }} />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {item.formattedValue || `${item.value}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default RadarChartRenderer;