export type ChartModelType = 'bar' | 'pie' | 'line' | 'radar' | 'gauge' | 'treemap' | 'funnel' | 'heatmap';
export type ColorPaletteId = 'emerald' | 'indigo' | 'purple' | 'amber' | 'cyan' | 'rose' | 'gold';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  primary: string;
  primaryHex: string;
  gradientFrom: string;
  gradientTo: string;
  colors: string[];
  bgSoft: string;
  borderSoft: string;
  textAccent: string;
}

export const COLOR_PALETTES: Record<ColorPaletteId, ColorPalette> = {
  emerald: { id: 'emerald', name: 'Esmeralda Fit (Padrão)', primary: 'emerald-500', primaryHex: '#10b981', gradientFrom: '#10b981', gradientTo: '#059669', colors: ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#a7f3d0'], bgSoft: 'bg-emerald-500/10', borderSoft: 'border-emerald-500/20', textAccent: 'text-emerald-400' },
  indigo: { id: 'indigo', name: 'Azul Real & Índigo', primary: 'indigo-500', primaryHex: '#6366f1', gradientFrom: '#6366f1', gradientTo: '#4338ca', colors: ['#6366f1', '#818cf8', '#4f46e5', '#a5b4fc', '#3730a3', '#c7d2fe'], bgSoft: 'bg-indigo-500/10', borderSoft: 'border-indigo-500/20', textAccent: 'text-indigo-400' },
  purple: { id: 'purple', name: 'Roxo Neon & Cyber', primary: 'purple-500', primaryHex: '#a855f7', gradientFrom: '#a855f7', gradientTo: '#7e22ce', colors: ['#a855f7', '#c084fc', '#9333ea', '#d8b4fe', '#7e22ce', '#e9d5ff'], bgSoft: 'bg-purple-500/10', borderSoft: 'border-purple-500/20', textAccent: 'text-purple-400' },
  amber: { id: 'amber', name: 'Laranja Solar & Âmbar', primary: 'amber-500', primaryHex: '#f59e0b', gradientFrom: '#f59e0b', gradientTo: '#d97706', colors: ['#f59e0b', '#fbbf24', '#d97706', '#fcd34d', '#b45309', '#fef3c7'], bgSoft: 'bg-amber-500/10', borderSoft: 'border-amber-500/20', textAccent: 'text-amber-400' },
  cyan: { id: 'cyan', name: 'Ciano Tropical & Elétrico', primary: 'cyan-500', primaryHex: '#06b6d4', gradientFrom: '#06b6d4', gradientTo: '#0e7490', colors: ['#06b6d4', '#22d3ee', '#0891b2', '#67e8f9', '#0e7490', '#cffafe'], bgSoft: 'bg-cyan-500/10', borderSoft: 'border-cyan-500/20', textAccent: 'text-cyan-400' },
  rose: { id: 'rose', name: 'Rosa Magenta & Coral', primary: 'rose-500', primaryHex: '#f43f5e', gradientFrom: '#f43f5e', gradientTo: '#be123c', colors: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c', '#ffe4e6'], bgSoft: 'bg-rose-500/10', borderSoft: 'border-rose-500/20', textAccent: 'text-rose-400' },
  gold: { id: 'gold', name: 'Ouro Real & Dourado', primary: 'yellow-500', primaryHex: '#eab308', gradientFrom: '#eab308', gradientTo: '#ca8a04', colors: ['#eab308', '#facc15', '#ca8a04', '#fde047', '#a16207', '#fef9c3'], bgSoft: 'bg-yellow-500/10', borderSoft: 'border-yellow-500/20', textAccent: 'text-yellow-400' },
};

export interface ChartDataItem {
  label: string;
  value: number;
  formattedValue?: string;
  secondaryValue?: string;
  color?: string;
  meta?: string;
}
