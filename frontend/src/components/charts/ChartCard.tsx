import React, { useState } from 'react';
import { BarChart3, PieChart, LineChart, Compass, Gauge, LayoutGrid, Filter, Palette, Info, ChevronDown } from 'lucide-react';
import { ChartModelType, ColorPaletteId, COLOR_PALETTES, ChartDataItem } from './chartTypes';
import { BarChartRenderer } from './BarChartRenderer';
import { DonutPieChartRenderer } from './DonutPieChartRenderer';
import { AreaLineChartRenderer } from './AreaLineChartRenderer';
import { RadarChartRenderer } from './RadarChartRenderer';
import { GaugeChartRenderer } from './GaugeChartRenderer';
import { TreemapChartRenderer } from './TreemapChartRenderer';
import { FunnelChartRenderer } from './FunnelChartRenderer';
import { HeatmapChartRenderer } from './HeatmapChartRenderer';
import { Student } from '../../types';

interface ChartCardProps {
  id: string;
  title: string;
  subtitle: string;
  categoryBadge: string;
  badgeColor?: string;
  data: ChartDataItem[];
  availableModels: ChartModelType[];
  defaultModel: ChartModelType;
  defaultPalette?: ColorPaletteId;
  laymanExplanation: string;
  executiveInsight?: string;
  isDarkMode: boolean;
  studentsForHeatmap?: Student[];
  gaugeMin?: number;
  gaugeMax?: number;
  gaugeUnit?: string;
  centerPointer?: boolean;
}

const MODEL_ICONS: Record<ChartModelType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  bar: { label: 'Barras', icon: BarChart3 },
  pie: { label: 'Pizza', icon: PieChart },
  line: { label: 'Linha', icon: LineChart },
  radar: { label: 'Radar', icon: Compass },
  gauge: { label: 'Medidor', icon: Gauge },
  treemap: { label: 'Blocos', icon: LayoutGrid },
  funnel: { label: 'Funil', icon: Filter },
  heatmap: { label: 'Calor', icon: LayoutGrid },
};

export const ChartCard: React.FC<ChartCardProps> = ({
  id, title, subtitle, categoryBadge,
  badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  data, availableModels, defaultModel, defaultPalette = 'emerald',
  laymanExplanation, executiveInsight, isDarkMode, studentsForHeatmap,
  gaugeMin = 0, gaugeMax = 100, gaugeUnit = '%', centerPointer,
}) => {
  const [selectedModel, setSelectedModel] = useState<ChartModelType>(defaultModel);
  const activeModel: ChartModelType = availableModels.includes(selectedModel) ? selectedModel : availableModels[0] || 'bar';
  const [selectedPaletteId, setSelectedPaletteId] = useState<ColorPaletteId>(defaultPalette);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const activePalette = COLOR_PALETTES[selectedPaletteId] || COLOR_PALETTES.emerald;

  return (
    <div className={`p-4 sm:p-5 md:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-w-0 overflow-hidden w-full ${isDarkMode ? 'bg-slate-900/70 border-slate-800 shadow-lg shadow-black/20' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80 w-full min-w-0">
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${badgeColor}`}>{categoryBadge}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Modo: {MODEL_ICONS[activeModel]?.label}</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 truncate">{title}</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-2">{subtitle}</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start sm:self-auto max-w-full">
            <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border max-w-[calc(100vw-6rem)] sm:max-w-none overflow-x-auto ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'}`}>
              {availableModels.map((modelKey) => {
                const info = MODEL_ICONS[modelKey];
                const Icon = info.icon;
                const isCurrent = activeModel === modelKey;
                return (
                  <button key={modelKey} onClick={() => setSelectedModel(modelKey)}
                    className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition shrink-0 ${isCurrent ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    title={`Visualizar como ${info.label}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{info.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative shrink-0">
              <button onClick={() => setShowColorPicker(!showColorPicker)}
                className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                title="Personalizar cores">
                <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: activePalette.primaryHex }} />
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showColorPicker && (
                <div className={`absolute right-0 top-full mt-2 w-48 sm:w-52 p-2 rounded-2xl border z-30 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2.5rem)] ${isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Tema de Cores</div>
                  <div className="space-y-1">
                    {Object.values(COLOR_PALETTES).map((p) => {
                      const isSelected = selectedPaletteId === p.id;
                      return (
                        <button key={p.id} onClick={() => { setSelectedPaletteId(p.id); setShowColorPicker(false); }}
                          className={`w-full flex items-center justify-between p-1.5 px-2 rounded-xl text-xs font-medium transition ${isSelected ? 'bg-slate-800/80 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'}`}>
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: p.primaryHex }} />
                            <span className="truncate">{p.name}</span>
                          </div>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="py-3 sm:py-4 my-1 w-full min-w-0 overflow-hidden">
          {activeModel === 'bar' && <BarChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} />}
          {activeModel === 'pie' && <DonutPieChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} centerTitle="Total" />}
          {activeModel === 'line' && <AreaLineChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} />}
          {activeModel === 'radar' && <RadarChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} />}
          {activeModel === 'gauge' && <GaugeChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} min={gaugeMin} max={gaugeMax} unit={gaugeUnit} centerPointer={centerPointer ?? id === 'chart-adimplencia'} />}
          {activeModel === 'treemap' && <TreemapChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} />}
          {activeModel === 'funnel' && <FunnelChartRenderer data={data} palette={activePalette} isDarkMode={isDarkMode} />}
          {selectedModel === 'heatmap' && studentsForHeatmap && <HeatmapChartRenderer students={studentsForHeatmap} palette={activePalette} isDarkMode={isDarkMode} />}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2 w-full min-w-0">
        <button onClick={() => setShowExplanation(!showExplanation)} className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">O que este gráfico significa? (Leigo)</span>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 ml-2">{showExplanation ? 'Ocultar' : 'Explicar'}</span>
        </button>

        {showExplanation && (
          <div className={`p-3 rounded-xl text-xs space-y-1.5 break-words ${isDarkMode ? 'bg-slate-800/40 border border-slate-800 text-slate-300' : 'bg-slate-50 border border-slate-200/80 text-slate-700'}`}>
            <p className="leading-relaxed">{laymanExplanation}</p>
            {executiveInsight && (
              <div className="flex items-start gap-1.5 pt-1 border-t border-slate-700/30 text-[11px] font-medium text-emerald-400">
                <span>💡 <strong>Dica prática:</strong> {executiveInsight}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
