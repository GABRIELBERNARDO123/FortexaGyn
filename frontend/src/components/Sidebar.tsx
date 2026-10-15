import React from 'react';
import { LayoutDashboard, BarChart3, CalendarCheck2, Users, Receipt, ShoppingBag, ClipboardList, FileCheck2, GraduationCap, Settings, Sun, Moon, Download, Feather, UserRoundCog } from 'lucide-react';
import { GymConfig, AppTheme } from '../types';
import { can } from '../lib/permissions';
import type { UserPublic } from '../contexts/AuthContext';

export type TabType = 'overview' | 'dashboard' | 'checkin' | 'alunos' | 'financeiro' | 'loja' | 'treinos' | 'avaliacoes' | 'professores' | 'conta';

interface Props {
  activeTab: TabType;
  user: UserPublic;
  onTabChange: (tab: TabType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentTheme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
  config: GymConfig;
  activeStudentsCount: number;
  pendingPaymentsCount: number;
  todayBirthdayCount: number;
  todayScheduledCount: number;
  onOpenSettings: () => void;
  onOpenExportModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab, user, onTabChange, isDarkMode, onToggleTheme, currentTheme = 'dark', onSelectTheme,
  config, activeStudentsCount, pendingPaymentsCount, todayBirthdayCount, todayScheduledCount,
  onOpenSettings, onOpenExportModal, isOpenMobile, onCloseMobile,
}) => {
  const navItems = [
    { id: 'overview' as TabType, label: 'Visão Geral', icon: LayoutDashboard, badge: todayBirthdayCount > 0 ? `${todayBirthdayCount} niver` : undefined, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3, badge: '360°', badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { id: 'checkin' as TabType, label: 'Controle de Check-in', icon: CalendarCheck2, badge: todayScheduledCount > 0 ? `${todayScheduledCount}` : undefined, badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { id: 'alunos' as TabType, label: 'Alunos & Prontuários', icon: Users, badge: `${activeStudentsCount}` },
    { id: 'financeiro' as TabType, label: 'Fluxo de Caixa', icon: Receipt, badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} pend.` : undefined, badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    { id: 'loja' as TabType, label: 'Loja & PDV', icon: ShoppingBag },
    { id: 'treinos' as TabType, label: 'Fichas de Treino', icon: ClipboardList },
    { id: 'avaliacoes' as TabType, label: 'Avaliações Físicas', icon: FileCheck2 },
    { id: 'professores' as TabType, label: 'Professores', icon: GraduationCap },
    { id: 'conta' as TabType, label: 'Conta', icon: UserRoundCog },
  ];

  return (
    <>
      {isOpenMobile && <div onClick={onCloseMobile} className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden" />}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 lg:w-72 flex-shrink-0 flex flex-col justify-between z-40 transition-transform duration-300 md:translate-x-0 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'} ${isDarkMode ? 'bg-slate-950 border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-slate-800 shadow-sm'}`}>
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-fort-icon.png" alt="FortexaGym" className="w-10 h-10 rounded-xl shadow-lg shadow-orange-500/20 object-cover" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">Fortexa<span className="text-orange-500">Gym</span></span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{config.gymName}</p>
              </div>
            </div>
          </div>
          <nav className="p-3.5 space-y-1">
            {navItems.filter((item) => item.id === 'conta' || can(user, ({ overview: 'students:read', dashboard: 'reports:read_operational', checkin: 'checkins:read', alunos: 'students:read', financeiro: 'finance:read', loja: 'products:read', treinos: 'workouts:read', avaliacoes: 'assessments:read', professores: 'coaches:read' } as Partial<Record<TabType, string>>)[item.id] || '')).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => { onTabChange(item.id); onCloseMobile(); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${isActive ? (isDarkMode ? 'bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm font-bold') : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70')}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-500' : isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 tabular-nums ${item.badgeColor || (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              <span>Aparência</span>
              <span>{currentTheme === 'dark' ? 'Cyber Fit' : currentTheme === 'light' ? 'Claro' : 'Minimal'}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900/40 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <button onClick={() => onSelectTheme ? onSelectTheme('dark') : onToggleTheme()} className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition ${currentTheme === 'dark' ? 'bg-emerald-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'}`} title="Modo Escuro">
                <Moon className="w-3.5 h-3.5 mb-0.5" /><span>Escuro</span>
              </button>
              <button onClick={() => onSelectTheme ? onSelectTheme('light') : onToggleTheme()} className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition ${currentTheme === 'light' ? 'bg-emerald-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'}`} title="Modo Claro">
                <Sun className="w-3.5 h-3.5 mb-0.5" /><span>Claro</span>
              </button>
              <button onClick={() => onSelectTheme ? onSelectTheme('minimal') : onToggleTheme()} className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition ${currentTheme === 'minimal' ? 'bg-zinc-200 text-zinc-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'}`} title="Modo Minimalista">
                <Feather className="w-3.5 h-3.5 mb-0.5" /><span>Minimal</span>
              </button>
            </div>
          </div>
          <button onClick={onOpenSettings} className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition ${isDarkMode ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'}`}>
            <div className="flex items-center gap-2.5"><Settings className="w-4 h-4 text-slate-400" /><span>Configurações PIX</span></div>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
          </button>
          <button onClick={onOpenExportModal} className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${isDarkMode ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-700 hover:bg-emerald-50'}`}>
            <Download className="w-3.5 h-3.5" /><span>Exportar Standalone HTML</span>
          </button>
        </div>
      </aside>
    </>
  );
};
