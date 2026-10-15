import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { TabType } from './Sidebar';
import type { Coach, Student } from '../lib/api';
import type { UserPublic } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatBRL, formatDateBR, formatDateTimeBR } from '../utils';
import { can } from '../lib/permissions';
import { ChartCard } from './charts/ChartCard';
import { CheckinTodayList } from './CheckinTodayList';
import type { ChartDataItem } from './charts/chartTypes';

interface Props {
  tab: Extract<TabType, 'overview' | 'dashboard' | 'checkin' | 'financeiro' | 'treinos' | 'avaliacoes'>;
  students: Student[];
  coaches: Coach[];
  focusStudentId?: string | null;
  isDarkMode: boolean;
  user: UserPublic;
  onMessage: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

type Row = Record<string, any>;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const panel = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4';
const field = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none';
const primary = 'rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50';

export function OperationsTab({ tab, students, coaches, focusStudentId, isDarkMode, user, onMessage }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('mensalidade');
  const [kind, setKind] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [exerciseNames, setExerciseNames] = useState('');
  const [coachId, setCoachId] = useState('');
  const [financialMode, setFinancialMode] = useState<'transaction' | 'payment'>('transaction');
  const [plan, setPlan] = useState<'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensal');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [editingId, setEditingId] = useState<string | null>(null);

  const endpoint = useMemo(() => ({
    checkin: '/checkins', financeiro: '/transactions', treinos: '/workouts', avaliacoes: '/assessments',
  } as const), []);
  const moduleForTab = tab === 'checkin' ? 'checkins' : tab === 'financeiro' ? 'finance' : tab === 'treinos' ? 'workouts' : 'assessments';
  const canCreate = can(user, `${moduleForTab}:create`);
  const canUpdate = can(user, `${moduleForTab}:update`);
  const canDelete = can(user, `${moduleForTab}:delete`);

  useEffect(() => {
    if (focusStudentId) setStudentId(focusStudentId);
  }, [focusStudentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'overview') {
        setSummary(await api.get<Row>('/overview'));
        setRows([]);
      } else if (tab === 'dashboard') {
        setSummary(await api.get<Row>('/dashboard/summary'));
        setRows([]);
      } else {
        const query = tab === 'checkin' ? { on_date: today(), student_id: focusStudentId }
          : focusStudentId && (tab === 'treinos' || tab === 'avaliacoes') ? { student_id: focusStudentId } : undefined;
        setRows(await api.get<Row[]>(endpoint[tab], query));
        if (tab === 'financeiro') {
          setSummary(await api.get<Row>('/transactions/summary', { start: `${today().slice(0, 7)}-01`, end: today() }));
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, focusStudentId, tab]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      let payload: Row;
      if (tab === 'checkin') {
        payload = { student_id: studentId, note: description.trim() };
      } else if (tab === 'financeiro') {
        payload = financialMode === 'payment'
          ? { student_id: studentId, plan, amount: Number(amount), paid_on: date, method: paymentMethod, note: description.trim() }
          : { kind, category, amount: Number(amount), description: description.trim(), occurred_on: date };
      } else if (tab === 'treinos') {
        payload = { student_id: studentId, coach_id: coachId || null, name: description.trim(), valid_from: date, exercises: exerciseNames.split('\n').map((name) => name.trim()).filter(Boolean).map((name, position) => ({ position, name })) };
      } else {
        payload = {
          student_id: studentId,
          assessed_on: date,
          weight_kg: weight ? Number(weight) : null,
          height_cm: height ? Number(height) : null,
          body_fat_pct: bodyFat ? Number(bodyFat) : null,
          muscle_mass_kg: muscleMass ? Number(muscleMass) : null,
          measures: {},
          notes: description.trim(),
        };
      }
      if (editingId) {
        const updatePayload = tab === 'financeiro'
          ? { amount: Number(amount), description: description.trim(), occurred_on: date }
          : tab === 'treinos'
            ? { name: description.trim(), valid_from: date }
            : { weight_kg: weight ? Number(weight) : null, height_cm: height ? Number(height) : null, body_fat_pct: bodyFat ? Number(bodyFat) : null, muscle_mass_kg: muscleMass ? Number(muscleMass) : null, notes: description.trim() };
        await api.patch(`${endpoint[tab as keyof typeof endpoint]}/${editingId}`, updatePayload);
      } else {
        const target = tab === 'financeiro' && financialMode === 'payment' ? '/payments' : endpoint[tab as keyof typeof endpoint];
        await api.post(target, payload);
      }
      setDescription(''); setAmount(''); setWeight(''); setHeight(''); setBodyFat(''); setMuscleMass(''); setExerciseNames(''); setCoachId('');
      setEditingId(null);
      onMessage(editingId ? 'Registro atualizado.' : 'Registro salvo com sucesso.');
      await load();
    } catch (cause) {
      onMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o registro.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const edit = (row: Row) => {
    setEditingId(row.id);
    setStudentId(row.student_id || '');
    setDescription(row.description || row.name || row.notes || '');
    setAmount(row.amount == null ? '' : String(row.amount));
    setCategory(row.category || 'mensalidade');
    setKind(row.kind === 'expense' ? 'expense' : 'income');
    setDate(row.occurred_on || row.valid_from || row.assessed_on || today());
    setWeight(row.weight_kg == null ? '' : String(row.weight_kg));
    setHeight(row.height_cm == null ? '' : String(row.height_cm));
    setBodyFat(row.body_fat_pct == null ? '' : String(row.body_fat_pct));
    setMuscleMass(row.muscle_mass_kg == null ? '' : String(row.muscle_mass_kg));
    setCoachId(row.coach_id || '');
    setExerciseNames('');
    setFinancialMode('transaction');
  };

  const cancelEdit = () => {
    setEditingId(null); setDescription(''); setAmount(''); setWeight(''); setHeight(''); setBodyFat(''); setMuscleMass(''); setExerciseNames(''); setCoachId('');
    setDate(today()); setStudentId('');
  };

  const remove = async (id: string) => {
    if (!window.confirm('Deseja remover este registro?')) return;
    try {
      await api.delete(`${endpoint[tab as keyof typeof endpoint]}/${id}`);
      onMessage('Registro removido.');
      await load();
    } catch (cause) {
      onMessage(cause instanceof Error ? cause.message : 'Não foi possível remover o registro.', 'warning');
    }
  };

  const title: Record<Props['tab'], string> = {
    overview: 'Visão Geral', dashboard: 'Dashboard', checkin: 'Controle de Check-in',
    financeiro: 'Fluxo de Caixa', treinos: 'Fichas de Treino', avaliacoes: 'Avaliações Físicas',
  };

  return (
    <section className="space-y-4" aria-labelledby="operations-title">
      <header className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
        <div><h2 id="operations-title" className="text-base font-bold text-white">{title[tab]}</h2><p className="mt-1 text-xs text-slate-400">Dados sincronizados com sua conta.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50">{loading ? 'Atualizando…' : 'Atualizar'}</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {loading && <div className={`${panel} text-center text-sm text-slate-400`} role="status">Carregando dados…</div>}

      {!loading && !error && (tab === 'overview' || tab === 'dashboard') && summary && (
        tab === 'overview' ? <Overview summary={summary} /> : <Dashboard summary={summary} isDarkMode={isDarkMode} />
      )}

      {!loading && !error && tab === 'financeiro' && summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Entradas no mês" value={formatBRL(summary.income || 0)} />
          <Metric label="Saídas no mês" value={formatBRL(summary.expense || 0)} />
          <Metric label="Saldo do mês" value={formatBRL(summary.balance || 0)} />
        </div>
      )}

      {!['overview', 'dashboard'].includes(tab) && (
        <>
          {tab === 'checkin' && <CheckinTodayList user={user} onMessage={onMessage} />}
          {(canCreate || (editingId !== null && canUpdate)) && <form onSubmit={submit} className={`${panel} grid gap-3 sm:grid-cols-2`}>
            {(tab === 'checkin' || tab === 'treinos' || tab === 'avaliacoes' || (tab === 'financeiro' && financialMode === 'payment')) && (
              <label className="space-y-1 text-xs font-semibold text-slate-300">Aluno
                <select required value={studentId} onChange={(e) => {
                  setStudentId(e.target.value);
                  const selected = students.find((student) => student.id === e.target.value);
                  if (selected && tab === 'financeiro') { setAmount(String(selected.price)); setPlan(selected.plan); }
                }} className={field}>
                  <option value="">Selecione um aluno</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </label>
            )}
            {tab === 'financeiro' && <>
              <label className="space-y-1 text-xs font-semibold text-slate-300">Lançamento
                <select value={financialMode} onChange={(e) => setFinancialMode(e.target.value as 'transaction' | 'payment')} className={field} disabled={Boolean(editingId)}><option value="transaction">Movimento avulso</option><option value="payment">Pagamento de mensalidade</option></select>
              </label>
              {financialMode === 'transaction' ? <>
                <label className="space-y-1 text-xs font-semibold text-slate-300">Tipo
                  <select value={kind} onChange={(e) => setKind(e.target.value as 'income' | 'expense')} className={field}><option value="income">Entrada</option><option value="expense">Saída</option></select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-300">Categoria
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
                    <option value="mensalidade">Mensalidade</option><option value="venda">Venda</option><option value="entrada_avulsa">Entrada avulsa</option><option value="estoque">Estoque</option><option value="despesa">Despesa</option><option value="saida_avulsa">Saída avulsa</option>
                  </select>
                </label>
              </> : <>
                <label className="space-y-1 text-xs font-semibold text-slate-300">Plano
                  <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className={field}><option>Mensal</option><option>Trimestral</option><option>Semestral</option><option>Anual</option></select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-300">Forma de pagamento
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de débito</option><option value="credito">Cartão de crédito</option><option value="boleto">Boleto</option></select>
                </label>
              </>}
              <label className="space-y-1 text-xs font-semibold text-slate-300">Valor (R$)<input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} /></label>
            </>}
            {tab === 'avaliacoes' && <>
              <label className="space-y-1 text-xs font-semibold text-slate-300">Peso (kg)<input min="0" step="0.1" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={field} /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-300">Altura (cm)<input min="0" step="0.1" type="number" value={height} onChange={(e) => setHeight(e.target.value)} className={field} /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-300">Gordura corporal (%)<input min="0" max="100" step="0.1" type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className={field} /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-300">Massa muscular (kg)<input min="0" step="0.1" type="number" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} className={field} /></label>
            </>}
            {tab === 'treinos' && <label className="space-y-1 text-xs font-semibold text-slate-300">Professor (opcional)
              <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={field}><option value="">Sem professor</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select>
            </label>}
            {(tab === 'checkin' || tab === 'financeiro' || tab === 'treinos' || tab === 'avaliacoes') && <label className="space-y-1 text-xs font-semibold text-slate-300">{tab === 'checkin' ? 'Observação' : tab === 'financeiro' ? financialMode === 'payment' ? 'Observação do pagamento' : 'Descrição' : tab === 'treinos' ? 'Nome da ficha' : 'Observações'}
              <input required={tab === 'financeiro' && financialMode === 'transaction' || tab === 'treinos'} value={description} onChange={(e) => setDescription(e.target.value)} className={field} maxLength={240} />
            </label>}
            {tab === 'treinos' && !editingId && <label className="space-y-1 text-xs font-semibold text-slate-300 sm:col-span-2">Exercícios (um por linha)
              <textarea required rows={4} value={exerciseNames} onChange={(e) => setExerciseNames(e.target.value)} placeholder="Agachamento\nSupino reto\nRemada" className={field} maxLength={3000} />
            </label>}
            {tab === 'treinos' && editingId && <p className="sm:col-span-2 text-xs text-slate-400">A API permite editar o nome e a data da ficha. Exercícios podem ser definidos na criação.</p>}
            {tab !== 'checkin' && <label className="space-y-1 text-xs font-semibold text-slate-300">Data<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>}
            <div className="sm:col-span-2 flex flex-wrap gap-2"><button className={primary} disabled={saving || ((tab !== 'financeiro' || financialMode === 'payment') && students.length === 0)}>{saving ? 'Salvando…' : editingId ? 'Atualizar registro' : tab === 'checkin' ? 'Registrar entrada' : tab === 'financeiro' && financialMode === 'payment' ? 'Registrar pagamento' : tab === 'financeiro' ? 'Salvar lançamento' : 'Salvar registro'}</button>{editingId && <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancelar edição</button>}</div>
          </form>
          }
          <div className={`${panel} overflow-x-auto`}>
            <h3 className="mb-3 text-sm font-bold text-white">Registros recentes</h3>
            {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nenhum registro encontrado.</p> : <div className="space-y-2">
              {rows.map((row) => <RecordRow key={row.id} row={row} tab={tab} students={students} canEdit={canUpdate} canDelete={canDelete} onEdit={() => edit(row)} onRemove={() => void remove(row.id)} />)}
            </div>}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className={panel}><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-extrabold text-emerald-400">{value}</p></div>;
}

function Overview({ summary }: { summary: Row }) {
  const upcoming = summary.upcoming_payments || [];
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Metric label="Check-ins de hoje" value={summary.checkins_today || 0} /><Metric label="Cobranças pendentes / próximas" value={upcoming.length} /></div>
    <div className={`${panel}`}><h3 className="mb-3 text-sm font-bold text-white">Mensalidades para acompanhar</h3>{upcoming.length ? <div className="space-y-2">{upcoming.map((item: Row) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-800/70 px-3 py-2 text-sm"><span>{item.name} · {item.plan}</span><span className="text-amber-300">{item.status.replace('_', ' ')}{item.period_end ? ` · ${formatDateBR(item.period_end)}` : ''}</span></div>)}</div> : <p className="text-sm text-slate-400">Nenhuma cobrança pendente ou próxima.</p>}</div></div>;
}

function Dashboard({ summary, isDarkMode }: { summary: Row; isDarkMode: boolean }) {
  const fin = summary.finance?.month || {};
  const checkins = summary.checkins || {};
  const birthdays = summary.birthdays_month || [];
  const daily = (summary.finance?.daily_30d || []) as Row[];
  const dailyFinance: ChartDataItem[] = daily.map((day) => ({
    label: formatDateBR(day.date).slice(0, 5),
    value: Number(day.income || 0) - Number(day.expense || 0),
    formattedValue: formatBRL(Number(day.income || 0) - Number(day.expense || 0)),
  }));
  const categories: ChartDataItem[] = Object.entries(fin.by_category || {}).map(([label, value]) => ({ label, value: Number(value) }));
  const products: ChartDataItem[] = (summary.top_products || []).map((product: Row) => ({ label: product.name, value: Number(product.quantity || 0) }));
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Metric label="Alunos ativos" value={summary.students?.active || 0} /><Metric label="Novos alunos no mês" value={summary.students?.new_this_month || 0} />
    <Metric label="Check-ins hoje" value={checkins.today || 0} /><Metric label="Treinos cadastrados" value={summary.workouts_count || 0} />
    <Metric label="Entradas no mês" value={formatBRL(fin.income || 0)} /><Metric label="Saídas no mês" value={formatBRL(fin.expense || 0)} />
    <Metric label="Saldo no mês" value={formatBRL(fin.balance || 0)} /><Metric label="Check-ins na semana" value={checkins.week || 0} />
  </div><div className="grid gap-4 xl:grid-cols-2">
    <ChartCard id="dashboard-cashflow" title="Saldo líquido diário" subtitle="Entradas menos saídas nos últimos 30 dias" categoryBadge="Financeiro" data={dailyFinance} availableModels={['line', 'bar']} defaultModel="line" laymanExplanation="Cada ponto mostra entradas menos saídas daquele dia. Os dados são agregados pelo servidor para esta academia." isDarkMode={isDarkMode} />
    <ChartCard id="dashboard-categories" title="Lançamentos por categoria" subtitle="Valores registrados no mês atual" categoryBadge="Financeiro" data={categories} availableModels={['pie', 'bar', 'treemap']} defaultModel="pie" laymanExplanation="Distribuição dos lançamentos financeiros agrupados por categoria no mês. O backend limita os valores à conta autenticada." isDarkMode={isDarkMode} />
    <ChartCard id="dashboard-products" title="Produtos mais vendidos" subtitle="Quantidade vendida no mês atual" categoryBadge="Loja" data={products} availableModels={['bar', 'pie', 'treemap']} defaultModel="bar" laymanExplanation="Exibe os produtos com mais unidades vendidas no período informado pelo backend." isDarkMode={isDarkMode} />
    <div className={`${panel}`}><h3 className="mb-3 text-sm font-bold text-white">Aniversariantes do mês</h3>{birthdays.length ? birthdays.map((person: Row) => <div key={person.id} className="flex justify-between border-b border-slate-800 py-2 text-sm"><span>{person.name}</span><span className="text-slate-400">{formatDateBR(person.birth_date)}</span></div>) : <p className="text-sm text-slate-400">Nenhum aniversário neste mês.</p>}</div>
  </div></div>;
}

function RecordRow({ row, tab, students, canEdit, canDelete, onEdit, onRemove }: { row: Row; tab: Props['tab']; students: Student[]; canEdit: boolean; canDelete: boolean; onEdit: () => void; onRemove: () => void }) {
  const student = students.find((item) => item.id === row.student_id);
  const label = tab === 'checkin' ? `${student?.name || 'Aluno'} · ${formatDateTimeBR(row.checked_in_at)}`
    : tab === 'financeiro' ? `${row.kind === 'income' ? 'Entrada' : 'Saída'} · ${row.description || row.category} · ${formatBRL(row.amount)} · ${formatDateBR(row.occurred_on)}`
    : tab === 'treinos' ? `${student?.name || 'Aluno'} · ${row.name} · válido desde ${formatDateBR(row.valid_from)}`
    : `${student?.name || 'Aluno'} · ${formatDateBR(row.assessed_on)} · ${row.weight_kg ? `${row.weight_kg} kg` : 'sem peso informado'}`;
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/70 px-3 py-2 text-sm"><span>{label}</span>{(canEdit && tab !== 'checkin' || canDelete) && <span className="flex gap-2">{canEdit && tab !== 'checkin' && <button type="button" onClick={onEdit} className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">Editar</button>}{canDelete && <button type="button" onClick={onRemove} className="rounded-lg border border-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Remover</button>}</span>}</div>;
}
