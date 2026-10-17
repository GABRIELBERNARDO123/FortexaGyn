import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AlunosTab } from './components/AlunosTab';
import { ProfessoresTab } from './components/ProfessoresTab';
import { LojaTab } from './components/LojaTab';
import { SettingsModal } from './components/SettingsModal';
import { StudentModal } from './components/StudentModal';
import { ProductModal } from './components/ProductModal';
import { OperationsTab } from './components/OperationsTab';
import { SaleModal } from './components/SaleModal';
import { WhatsAppMessageModal, type WhatsAppDraft } from './components/WhatsAppMessageModal';
import { AccountTab } from './components/AccountTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { api, type Coach, type Student, type Product } from './lib/api';
import { initialConfig } from './mockData';
import { can } from './lib/permissions';
import { buildWhatsAppMessage, normalizeWhatsAppPhone, type WhatsAppTemplateId } from './lib/whatsapp.js';
import type { GymConfig, AppTheme } from './types';

export default function App() {
  const { user, tenant, loading: authLoading, logout, refresh } = useAuth();

  const [theme, setTheme] = useState<AppTheme>('dark');

  // ─── Menu colapsável (3 estados), persistido em localStorage ───
  const [menuState, setMenuState] = useState<'aberto' | 'icones' | 'oculto'>(() => {
    try {
      const s = localStorage.getItem('fx-menu');
      if (s === 'aberto' || s === 'icones' || s === 'oculto') return s;
    } catch {}
    return 'aberto';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-menu', menuState);
    try { localStorage.setItem('fx-menu', menuState); } catch {}

    // FIX: força largura da sidebar via JS (Tailwind v4 corta o CSS)
    const apply = () => {
      const aside = document.querySelector('aside');
      if (!aside) return;
      if (menuState === 'oculto') {
        aside.style.setProperty('display', 'none', 'important');
        aside.style.setProperty('width', '0', 'important');
        aside.style.setProperty('min-width', '0', 'important');
      } else if (menuState === 'icones') {
        aside.style.setProperty('display', 'flex', 'important');
        aside.style.setProperty('width', '72px', 'important');
        aside.style.setProperty('min-width', '72px', 'important');
        aside.style.setProperty('max-width', '72px', 'important');
        aside.style.setProperty('flex-shrink', '0', 'important');
      } else {
        aside.style.removeProperty('display');
        aside.style.removeProperty('width');
        aside.style.removeProperty('min-width');
        aside.style.removeProperty('max-width');
        aside.style.removeProperty('flex-shrink');
      }
    };
    apply();
    const t = setTimeout(apply, 100);
    return () => clearTimeout(t);
  }, [menuState]);

  useEffect(() => {
    if (menuState === 'oculto') {
      document.querySelector<HTMLButtonElement>('.fx-menu-fab')?.focus();
    } else if (menuState === 'icones') {
      document.querySelector<HTMLButtonElement>('[data-menu-act="mais"]')?.focus();
    }
  }, [menuState]);

  const stepMenu = (dir: 1 | -1) => setMenuState((s) => {
    // ordem crescente: oculto → icones → aberto
    // -1 recolhe (encolhe), +1 expande (volta)
    const ordem = ['oculto', 'icones', 'aberto'] as const;
    const i = ordem.indexOf(s) + dir;
    return ordem[Math.max(0, Math.min(2, i))] as typeof s;
  });

  // Quando o usuário loga/muda, aplica o tema salvo dele como padrão da sessão.
  // Durante a sessão, ele pode trocar (mudança é local até recarregar).
  useEffect(() => {
    if (user?.theme) setTheme(user.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sincroniza tema com CSS (data-tema no <html>)
  useEffect(() => {
    const map: Record<AppTheme, string> = { dark: 'escuro', light: 'claro', minimal: 'minimal' };
    const html = document.documentElement;
    html.setAttribute('data-tema', map[theme]);
    // Tailwind dark mode: liga class="dark" só quando não for claro
    if (theme === 'light') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }, [theme]);

  // force-input-color: Tailwind injeta text-slate-100 nos componentes,
  // vencendo o CSS global. Inline style com !important é imune.
  useEffect(() => {
    if (theme !== 'light') return;

    const fix = () => {
      document.querySelectorAll<HTMLElement>('input, textarea, select').forEach((el) => {
        el.style.setProperty('color', '#111111', 'important');
        el.style.setProperty('-webkit-text-fill-color', '#111111', 'important');
        el.style.setProperty('caret-color', '#111111', 'important');
        el.style.setProperty('background-color', '#FFFFFF', 'important');
      });
    };

    fix();
    const t = setTimeout(fix, 400);
    const obs = new MutationObserver(fix);
    obs.observe(document.body, { childList: true, subtree: true });

    return () => { clearTimeout(t); obs.disconnect(); };
  }, [theme]);
  const isDarkMode = theme === 'dark' || theme === 'minimal';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-minimal');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'minimal') root.classList.add('dark', 'theme-minimal');
  }, [theme]);

  const [activeTab, setActiveTab] = useState<TabType>('alunos');

  // Redirect: usuário tablet vai direto pra tela de check-in
  useEffect(() => {
    if (user?.access_profile === 'tablet_checkin') {
      window.location.href = '/checkin-tablet';
    }
  }, [user]);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [whatsAppDraft, setWhatsAppDraft] = useState<WhatsAppDraft | null>(null);

  const addToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const prepareWhatsApp = (recipientKind: 'student' | 'coach', recipient: { name: string; phone: string | null }, templateId: WhatsAppTemplateId) => {
    if (!normalizeWhatsAppPhone(recipient.phone)) {
      addToast('Cadastre um telefone válido com DDD antes de abrir o WhatsApp.', 'warning');
      return;
    }
    setWhatsAppDraft({
      recipientKind,
      recipientName: recipient.name,
      phone: recipient.phone!,
      templateId,
      originalMessage: buildWhatsAppMessage(templateId, { recipientName: recipient.name, gymName: config.gymName }),
    });
  };

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const config: GymConfig = { ...initialConfig, gymName: tenant?.name || 'FortexaGym' };

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [c, s, p, overview] = await Promise.all([
        api.coaches.list(),
        api.students.list(),
        api.products.list(),
        can(user, 'finance:read') ? api.get<{ upcoming_payments?: unknown[] }>('/overview') : Promise.resolve({ upcoming_payments: [] }),
      ]);
      setCoaches(c);
      setStudents(s);
      setProducts(p);
      setPendingPaymentsCount(overview.upcoming_payments?.length ?? 0);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !tenant) return;
    loadData();
  }, [user, tenant, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user || !tenant) return <LoginScreen />;

  const todayYMD = new Date().toISOString().slice(0, 10);
  const activeStudentsCount = students.filter((s) => s.status === 'active').length;
  const todayBirthdayCount = students.filter((s) => s.birth_date.endsWith(todayYMD.slice(5))).length;
  const todayAbbr = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date().getDay()];
  const todayScheduledCount = students.filter(
    (s) => s.status === 'active' && s.workout_days?.includes(todayAbbr),
  ).length;

  const handleLogout = async () => {
    await logout();
    setCoaches([]); setStudents([]); setProducts([]);
  };

  return (
    <div className={`min-h-screen flex ${theme === 'minimal' ? 'bg-[#121316] text-zinc-200' : isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar
        activeTab={activeTab}
        user={user}
        onTabChange={(tab) => { setActiveTab(tab); setFocusedStudentId(null); }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        currentTheme={theme}
        onSelectTheme={setTheme}
        config={config}
        activeStudentsCount={activeStudentsCount}
        pendingPaymentsCount={pendingPaymentsCount}
        todayBirthdayCount={todayBirthdayCount}
        todayScheduledCount={todayScheduledCount}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenExportModal={() => addToast('A exportação standalone ainda não está disponível.', 'warning')}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        menuState={menuState}
        onMenuStep={stepMenu}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        <button
          type="button"
          className="fx-menu-fab"
          data-menu-act="mais"
          aria-label="Mostrar menu"
          title="Mostrar menu"
          onClick={() => stepMenu(1)}
        >
          {'››'}
        </button>
        <Header
          activeTab={activeTab}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          currentTheme={theme}
          onSelectTheme={setTheme}
          onOpenNewStudent={() => { setStudentToEdit(null); setStudentModalOpen(true); }}
          onOpenQuickSale={() => { setActiveTab('loja'); setSaleModalOpen(true); }}
          canCreateStudent={can(user, 'students:create')}
          canCreateSale={can(user, 'sales:create')}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto space-y-6 min-w-0 overflow-x-hidden">
          {dataError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <strong>Erro ao carregar dados:</strong> {dataError}
            </div>
          )}

          {dataLoading && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-400 text-sm text-center">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin mb-2" />
              Carregando dados do servidor...
            </div>
          )}

          {!dataLoading && activeTab === 'alunos' && (
            <AlunosTab
              students={students}
              coaches={coaches}
              isDarkMode={isDarkMode}
              canCreate={can(user, 'students:create')}
              canUpdate={can(user, 'students:update')}
              canDelete={can(user, 'students:delete')}
              canViewWorkouts={can(user, 'workouts:read')}
              canViewHealth={can(user, 'assessments:read')}
              onOpenNewStudentModal={() => { setStudentToEdit(null); setStudentModalOpen(true); }}
              onEditStudent={(s) => { setStudentToEdit(s); setStudentModalOpen(true); }}
              onDeleteStudent={async (id) => {
                if (!confirm('Remover este aluno?')) return;
                try {
                  await api.students.remove(id);
                  addToast('Aluno removido');
                  await loadData();
                } catch (e) { addToast('Erro ao remover', 'warning'); }
              }}
              onOpenWhatsApp={(student) => prepareWhatsApp('student', student, 'student_contact')}
              onOpenProntuario={(student) => { setFocusedStudentId(student.id); setActiveTab('avaliacoes'); }}
              onNavigateToWorkout={(id) => { setFocusedStudentId(id); setActiveTab('treinos'); }}
            />
          )}

          {!dataLoading && activeTab === 'professores' && (
            <ProfessoresTab
              coaches={coaches}
              students={students}
              isDarkMode={isDarkMode}
              canCreate={can(user, 'coaches:create')}
              canUpdate={can(user, 'coaches:update')}
              canDelete={can(user, 'coaches:delete')}
              onSaveCoach={async (data, id) => {
                if (id) await api.coaches.update(id, data);
                else await api.coaches.create(data);
                addToast(id ? 'Professor atualizado' : 'Professor criado');
                await loadData();
              }}
              onDeleteCoach={async (id) => {
                if (!confirm('Remover este professor?')) return;
                try {
                  await api.coaches.remove(id);
                  addToast('Professor removido');
                  await loadData();
                } catch (e) { addToast('Erro ao remover', 'warning'); }
              }}
              onOpenWhatsApp={(coach) => prepareWhatsApp('coach', coach, 'coach_contact')}
            />
          )}

          {!dataLoading && activeTab === 'loja' && (
            <LojaTab
              products={products}
              isDarkMode={isDarkMode}
              canCreateProduct={can(user, 'products:create')}
              canUpdateProduct={can(user, 'products:update')}
              canDeleteProduct={can(user, 'products:delete')}
              canCreateSale={can(user, 'sales:create')}
              onOpenNewProductModal={() => { setProductToEdit(null); setProductModalOpen(true); }}
              onOpenQuickSale={() => setSaleModalOpen(true)}
              onEditProduct={(product) => { setProductToEdit(product); setProductModalOpen(true); }}
              onDeleteProduct={async (id) => {
                if (!confirm('Remover este produto?')) return;
                try {
                  await api.products.remove(id);
                  addToast('Produto removido');
                  await loadData();
                } catch (e) { addToast('Erro ao remover', 'warning'); }
              }}
            />
          )}

          {!dataLoading && ['overview', 'dashboard', 'checkin', 'financeiro', 'treinos', 'avaliacoes'].includes(activeTab) && (
            <OperationsTab
              tab={activeTab as 'overview' | 'dashboard' | 'checkin' | 'financeiro' | 'treinos' | 'avaliacoes'}
              students={students}
              coaches={coaches}
              focusStudentId={focusedStudentId}
              isDarkMode={isDarkMode}
              user={user}
              onMessage={addToast}
            />
          )}

          {activeTab === 'relatorios' && <RelatoriosTab />}

          {activeTab === 'conta' && user && tenant && (
            <AccountTab user={user} tenant={tenant} onLogout={handleLogout} onRefresh={refresh} />
          )}
        </main>
      </div>

      <StudentModal
        isOpen={studentModalOpen}
        onClose={() => { setStudentModalOpen(false); setStudentToEdit(null); }}
        onSave={async (data) => {
          try {
            if (studentToEdit) {
              await api.students.update(studentToEdit.id, data as any);
              addToast('Aluno atualizado');
            } else {
              await api.students.create(data as any);
              addToast('Aluno criado');
            }
            setStudentModalOpen(false);
            setStudentToEdit(null);
            await loadData();
          } catch (e) { addToast('Erro ao salvar aluno', 'warning'); }
        }}
        studentToEdit={studentToEdit}
        coaches={coaches}
        isDarkMode={isDarkMode}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => { setProductModalOpen(false); setProductToEdit(null); }}
        onSave={async (data) => {
          try {
            if (productToEdit) {
              await api.products.update(productToEdit.id, data);
              addToast('Produto atualizado');
            } else {
              await api.products.create(data as any);
              addToast('Produto criado');
            }
            setProductModalOpen(false);
            setProductToEdit(null);
            await loadData();
          } catch (e) { addToast(productToEdit ? 'Erro ao atualizar produto' : 'Erro ao criar produto', 'warning'); }
        }}
        productToEdit={productToEdit}
        isDarkMode={isDarkMode}
      />

      <SaleModal
        isOpen={saleModalOpen}
        products={products}
        students={students}
        onClose={() => setSaleModalOpen(false)}
        onSave={async (sale) => {
          try {
            await api.post('/sales', sale);
            addToast('Venda registrada; estoque e fluxo de caixa atualizados.');
            setSaleModalOpen(false);
            await loadData();
            return true;
          } catch (e) {
            addToast(e instanceof Error ? e.message : 'Não foi possível registrar a venda.', 'warning');
            return false;
          }
        }}
      />

      <SettingsModal
  isOpen={settingsModalOpen}
  onClose={() => setSettingsModalOpen(false)}
  config={config}
  isDarkMode={isDarkMode}
  canManageUsers={user?.role === 'owner'}
  canEditAccount={user?.role === 'owner'}
  onUserCreated={refresh}
  onAccountUpdated={refresh}

      />

      <WhatsAppMessageModal draft={whatsAppDraft} isDarkMode={isDarkMode} onClose={() => setWhatsAppDraft(null)} />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
