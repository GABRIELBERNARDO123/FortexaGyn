import React from 'react';
import { Menu, Sun, Moon, Feather, UserPlus, ShoppingCart, Calendar } from 'lucide-react';
import { TabType } from './Sidebar';
import { AppTheme } from '../types';

interface Props {
  activeTab: TabType;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentTheme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
  onOpenNewStudent: () => void;
  onOpenQuickSale: () => void;
  canCreateStudent: boolean;
  canCreateSale: boolean;
  onToggleMobileMenu: () => void;
}

const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
  overview: { title: 'Visão Geral', subtitle: 'Painel operacional, calendário interativo e métricas da academia' },
  dashboard: { title: 'Dashboard', subtitle: 'Visão executiva 360°, comparativo de todos os ambientes e gráficos interativos' },
  checkin: { title: 'Controle de Check-in', subtitle: 'Lista de presença filtrada para os agendados do dia' },
  alunos: { title: 'Gestão de Alunos', subtitle: 'Prontuários médicos, professores e controle de mensalidades' },
  financeiro: { title: 'Fluxo de Caixa', subtitle: 'Entradas unificadas (mensalidades e PDV) e saídas operacionais' },
  loja: { title: 'Loja & PDV', subtitle: 'Frente de caixa integrada, controle de estoque e histórico' },
  treinos: { title: 'Fichas de Treino', subtitle: 'Rotinas personalizadas com envio no WhatsApp' },
  avaliacoes: { title: 'Avaliações Físicas', subtitle: 'Anexos de bioimpedância, relatórios e documentos médicos' },
  professores: { title: 'Professores & Treinadores', subtitle: 'Corpo docente credenciado e distribuição de alunos' },
  conta: { title: 'Conta', subtitle: 'Dados da academia, usuário adicional, permissões e sessão' },
};

export const Header: React.FC<Props> = ({
  activeTab, isDarkMode, onToggleTheme, currentTheme = 'dark', onSelectTheme,
  onOpenNewStudent, onOpenQuickSale, canCreateStudent, canCreateSale, onToggleMobileMenu,
}) => {
  const current = tabTitles[activeTab] || tabTitles.overview;
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const handleCycleTheme = () => {
    if (!onSelectTheme) { onToggleTheme(); return; }
    if (currentTheme === 'dark') onSelectTheme('light');
    else if (currentTheme === 'light') onSelectTheme('minimal');
    else onSelectTheme('dark');
  };

  return (
    <header className={`sticky top-0 z-30 px-3.5 sm:px-5 md:px-8 py-2.5 sm:py-3.5 border-b backdrop-blur-md transition-colors w-full min-w-0 ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'}`}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 truncate">
          <button onClick={onToggleMobileMenu} className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0" title="Abrir menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight truncate">{current.title}</h1>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">{current.subtitle}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 border-slate-200 bg-slate-50 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          <span className="capitalize">{capitalizedDate}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {canCreateSale && <button onClick={onOpenQuickSale} className={`hidden sm:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border transition ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}`} title="Ir para o PDV">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" /><span className="whitespace-nowrap">PDV Rápido</span>
          </button>}
          {canCreateStudent && <button onClick={onOpenNewStudent} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition shadow-md bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20 active:scale-95">
            <UserPlus className="w-3.5 h-3.5 shrink-0" /><span className="whitespace-nowrap">Novo Aluno</span>
          </button>}
          <button onClick={handleCycleTheme}
            className={`p-1.5 sm:p-2 rounded-xl border transition shrink-0 ${currentTheme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800' : currentTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'}`}
            title={`Tema: ${currentTheme === 'dark' ? 'Escuro' : currentTheme === 'light' ? 'Claro' : 'Minimal'}`}>
            {currentTheme === 'dark' && <Moon className="w-4 h-4" />}
            {currentTheme === 'light' && <Sun className="w-4 h-4" />}
            {currentTheme === 'minimal' && <Feather className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
