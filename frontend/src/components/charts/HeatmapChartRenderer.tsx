import React, { useState } from 'react';
import { ColorPalette } from './chartTypes';
import { Student } from '../../types';

interface Props {
  students: Student[];
  palette: ColorPalette;
  isDarkMode: boolean;
  height?: number;
}

export const HeatmapChartRenderer: React.FC<Props> = ({ students, palette, isDarkMode }) => {
  const [hoveredCell, setHoveredCell] = useState<{ slot: string; day: string; count: number; names: string[] } | null>(null);

  const timeSlots = [
    { label: '06h - 09h (Manhã Cedo)', shortLabel: '06h-09h', range: ['06:', '07:', '08:'] },
    { label: '09h - 12h (Manhã)', shortLabel: '09h-12h', range: ['09:', '10:', '11:'] },
    { label: '12h - 15h (Almoço)', shortLabel: '12h-15h', range: ['12:', '13:', '14:'] },
    { label: '15h - 18h (Tarde)', shortLabel: '15h-18h', range: ['15:', '16:', '17:'] },
    { label: '18h - 22h (Noite / Pico)', shortLabel: '18h-22h', range: ['18:', '19:', '20:', '21:'] },
  ];

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const matrix = timeSlots.map((slot) => {
    const daysData: Record<string, { count: number; names: string[] }> = {};
    weekDays.forEach((day) => {
      const matching = students.filter((s) => {
        if (s.status !== 'Ativo') return false;
        const matchDay = s.workoutDays?.includes(day as any);
        const time = s.workoutTime || '';
        const matchTime = slot.range.some((prefix) => time.startsWith(prefix));
        return matchDay && matchTime;
      });
      daysData[day] = { count: matching.length, names: matching.map((s) => s.name) };
    });
    return { slotLabel: slot.label, shortLabel: slot.shortLabel, daysData };
  });

  return (
    <div className="w-full space-y-3 py-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="text-slate-400 min-h-[22px] min-w-0 truncate">
          {hoveredCell ? (
            <span className="text-slate-900 dark:text-white font-semibold truncate block">
              <strong className="text-emerald-400">{hoveredCell.count} alunos</strong> em {hoveredCell.day} ({hoveredCell.slot}):{' '}
              <span className="text-[11px] text-slate-400 font-normal">
                {hoveredCell.names.slice(0, 3).join(', ')}
                {hoveredCell.names.length > 3 && ` +${hoveredCell.names.length - 3}`}
              </span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Toque ou passe o cursor sobre as células</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
          <span className="w-2.5 h-2.5 rounded bg-slate-800" /> Vazio
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: `${palette.primaryHex}40` }} /> Leve
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: `${palette.primaryHex}90` }} /> Médio
          <span className="w-2.5 h-2.5 rounded shadow-sm" style={{ backgroundColor: palette.primaryHex }} /> Pico
        </div>
      </div>

      <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        <table className="w-full text-left text-xs min-w-[340px]">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700/60 uppercase text-[10px] font-bold">
              <th className="py-2 px-2 sm:px-3 whitespace-nowrap">Faixa Horária</th>
              {weekDays.map((d) => (
                <th key={d} className="py-2 px-1.5 sm:px-3 text-center">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {matrix.map((row) => (
              <tr key={row.slotLabel} className="hover:bg-slate-800/20 transition">
                <td className="py-2 px-2 sm:px-3 font-medium text-slate-300 text-[11px] whitespace-nowrap">
                  <span className="sm:hidden">{row.shortLabel}</span>
                  <span className="hidden sm:inline">{row.slotLabel}</span>
                </td>
                {weekDays.map((day) => {
                  const data = row.daysData[day] || { count: 0, names: [] };
                  const count = data.count;
                  let cellStyle: React.CSSProperties = { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#64748b' };
                  if (count === 1) cellStyle = { backgroundColor: `${palette.primaryHex}35`, color: isDarkMode ? '#e2e8f0' : '#0f172a', fontWeight: 600 };
                  else if (count >= 2 && count < 4) cellStyle = { backgroundColor: `${palette.primaryHex}80`, color: '#ffffff', fontWeight: 700 };
                  else if (count >= 4) cellStyle = { backgroundColor: palette.primaryHex, color: '#0f172a', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' };

                  return (
                    <td key={day} className="py-1 px-1 sm:px-2 text-center">
                      <button
                        onClick={() => setHoveredCell({ slot: row.slotLabel, day, count, names: data.names })}
                        onMouseEnter={() => setHoveredCell({ slot: row.slotLabel, day, count, names: data.names })}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={cellStyle}
                        className="w-8 sm:w-10 h-7 sm:h-8 rounded-lg text-xs tabular-nums transition-transform hover:scale-105 active:scale-95 flex items-center justify-center mx-auto"
                      >
                        {count}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
