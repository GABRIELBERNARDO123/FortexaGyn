import { useCallback, useEffect, useState, type JSX } from 'react';
import { api } from '../lib/api';
import type { UserPublic } from '../contexts/AuthContext';

interface StudentToday {
  id: string;
  name: string;
  plan: string;
  workout_time: string | null;
  coach_name: string;
  scheduled: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  missed_today: boolean;
  missed_info: { id: string; missed_date: string; new_date: string; new_time: string | null; reason: string } | null;
  rescheduled_info: { id: string; missed_date: string; new_date: string; new_time: string | null; reason: string } | null;
  rescheduled_to_today: boolean;
}

interface TodayResponse {
  date: string;
  weekday: string;
  total_scheduled: number;
  total_checked_in: number;
  total_missed: number;
  total_students: number;
  students: StudentToday[];
}

interface Props {
  user: UserPublic;
  onMessage: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

const panel = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4';
const field = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none';

function formatBR(iso: string | null | undefined) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function CheckinTodayList({ onMessage }: Props) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalStudent, setModalStudent] = useState<StudentToday | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<TodayResponse>('/checkins/today');
      setData(res);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Erro ao carregar', 'warning');
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => { void load(); }, [load]);

  const openModal = (s: StudentToday) => {
    setModalStudent(s);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setModalDate(tomorrow.toISOString().slice(0, 10));
    setModalTime(s.workout_time || '');
    setModalReason('');
  };

  const closeModal = () => setModalStudent(null);

  const submitReschedule = async () => {
    if (!modalStudent || !modalDate) return;
    setSaving(true);
    try {
      await api.post(`/checkins/reschedule/${modalStudent.id}`, {
        new_date: modalDate,
        new_time: modalTime || null,
        reason: modalReason,
      });
      onMessage('Remarcação registrada.');
      closeModal();
      await load();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Erro ao salvar', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const confirmArrival = async (s: StudentToday) => {
    try {
      await api.post(`/checkins/confirm/${s.id}`, {});
      onMessage(`${s.name} — chegada confirmada.`);
      await load();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Erro ao confirmar', 'warning');
    }
  };

  if (loading && !data) return <div className={`${panel} text-center text-sm text-slate-400`}>Carregando alunos…</div>;
  if (!data) return null;

  const q = search.toLowerCase().trim();
  const filtered = data.students.filter(s => !q || s.name.toLowerCase().includes(q));

  const scheduled = filtered.filter(s => s.scheduled && !s.missed_today && !s.checked_in);
  const rescheduled = filtered.filter(s => s.rescheduled_to_today && !s.missed_today && !s.checked_in);
  const missed = filtered.filter(s => s.missed_today);
  const others = filtered.filter(s => !s.scheduled && !s.missed_today && !s.checked_in && !s.rescheduled_to_today);

  const renderCard = (s: StudentToday) => {
    let cls = 'bg-slate-800/50 border-slate-700';
    if (s.checked_in) cls = 'bg-emerald-950/40 border-emerald-500/40';
    else if (s.missed_today) cls = 'bg-rose-950/30 border-rose-500/40';
    else if (s.scheduled) cls = 'bg-slate-800/50 border-orange-500/40';

    const badges: JSX.Element[] = [];
    if (s.scheduled && !s.missed_today && !s.checked_in) badges.push(<span key="hoje" className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 font-bold uppercase">Hoje</span>);
    if (s.missed_today && s.missed_info) {
      badges.push(<span key="faltou" className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold uppercase">Faltou</span>);
      badges.push(<span key="remarc" className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 font-semibold">Remarcado {formatBR(s.missed_info.missed_date)} → {formatBR(s.missed_info.new_date)}</span>);
    }
    if (s.rescheduled_to_today && s.rescheduled_info) {
      badges.push(<span key="de" className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase">Remarcado de {formatBR(s.rescheduled_info.missed_date)}</span>);
    }

    return (
      <div key={s.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 ${cls} p-3`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${s.checked_in ? 'bg-emerald-500 text-slate-950' : s.missed_today ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-300'}`}>
            {initials(s.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              {s.name}
              {badges}
            </div>
            <div className="text-xs text-slate-400">
              {s.workout_time || 'Sem horário'} • Prof: {s.coach_name || '—'}
              {s.checked_in_at && <span className="text-emerald-400 font-semibold ml-2">• Chegou {new Date(s.checked_in_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>}
            </div>
            {s.missed_info?.reason && <div className="text-xs text-rose-300/80 italic mt-0.5">"{s.missed_info.reason}"</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.checked_in ? (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">Presente</span>
          ) : s.missed_today ? (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold">Faltou</span>
          ) : (
            <>
              <button type="button" onClick={() => openModal(s)} className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 font-bold">Não vou vir</button>
              <button type="button" onClick={() => void confirmArrival(s)} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-black">Chegou</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-white">
            Alunos de hoje
            <span className="ml-2 text-xs text-slate-400">{data.total_students} cadastrados</span>
          </h3>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Agendados: <b className="text-orange-400">{data.total_scheduled}</b></span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Chegaram: <b className="text-emerald-400">{data.total_checked_in}</b></span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Faltaram: <b className="text-rose-400">{data.total_missed}</b></span>
          </div>
        </div>
        <input type="text" placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${field} mb-3`} />
        <div className="space-y-4">
          {scheduled.length > 0 && (
            <div>
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">📅 Agendados hoje</div>
              <div className="space-y-2">{scheduled.map(renderCard)}</div>
            </div>
          )}
          {rescheduled.length > 0 && (
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">🔄 Remarcados para hoje</div>
              <div className="space-y-2">{rescheduled.map(renderCard)}</div>
            </div>
          )}
          {missed.length > 0 && (
            <div>
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">❌ Faltaram hoje</div>
              <div className="space-y-2">{missed.map(renderCard)}</div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">👥 Outros alunos</div>
              <div className="space-y-2">{others.map(renderCard)}</div>
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-4">{search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</p>
          )}
        </div>
      </div>

      {modalStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white">Não vou poder vir</h4>
              <button onClick={closeModal} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-sm text-slate-400">Aluno: <span className="text-white font-bold">{modalStudent.name}</span></p>
            <label className="block text-xs font-bold text-slate-400 uppercase">Nova data</label>
            <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className={field} />
            <label className="block text-xs font-bold text-slate-400 uppercase">Novo horário (opcional)</label>
            <input type="text" value={modalTime} onChange={(e) => setModalTime(e.target.value)} placeholder="Ex: 19:00" maxLength={10} className={field} />
            <label className="block text-xs font-bold text-slate-400 uppercase">Motivo (opcional)</label>
            <textarea rows={3} value={modalReason} onChange={(e) => setModalReason(e.target.value)} maxLength={1000} className={`${field} resize-none`} placeholder="Ex: Aluno avisou que está doente" />
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm">Cancelar</button>
              <button onClick={() => void submitReschedule()} disabled={saving || !modalDate} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
