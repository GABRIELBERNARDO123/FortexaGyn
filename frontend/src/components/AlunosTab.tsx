import { useState, useMemo } from 'react';
import type { Coach, Student } from '../lib/api';
import { formatBRL } from '../utils';

interface Props {
  students: Student[];
  coaches: Coach[];
  isDarkMode: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canViewWorkouts: boolean;
  canViewHealth: boolean;
  onOpenNewStudentModal: () => void;
  onEditStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenWhatsApp: (s: Student) => void;
  onOpenProntuario: (s: Student) => void;
  onNavigateToWorkout: (id: string) => void;
}

export function AlunosTab({ students, coaches, isDarkMode, canCreate, canUpdate, canDelete, canViewWorkouts, canViewHealth, onOpenNewStudentModal, onEditStudent, onDeleteStudent, onOpenWhatsApp, onOpenProntuario, onNavigateToWorkout }: Props) {
  const [filterCoach, setFilterCoach] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => students.filter((s) => {
    if (filterCoach !== 'all' && s.coach_id !== filterCoach) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [students, filterCoach, search]);

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <input type="text" placeholder="Buscar aluno por nome..." value={search} onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200'}`} />
        <select value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)}
          className={`text-xs rounded-xl px-3 py-2.5 border focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'}`}>
          <option value="all">Todos os professores</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {canCreate && <button onClick={onOpenNewStudentModal} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950">+ Novo Aluno</button>}
      </div>

      {filtered.length === 0 ? (
        <div className={`p-12 rounded-2xl border text-center text-xs ${isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>Nenhum aluno encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const coach = coaches.find((c) => c.id === s.coach_id);
            return (
              <div key={s.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0"><h4 className="font-bold text-sm truncate">{s.name}</h4><p className="text-xs text-slate-400">{s.phone}</p></div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                    s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    s.status === 'inactive' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {s.status === 'active' ? 'Ativo' : s.status === 'inactive' ? 'Inativo' : 'Desistente'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Plano:</span><span className="text-slate-200">{s.plan} ({formatBRL(s.price)})</span></div>
                  <div className="flex justify-between"><span>Prof:</span><span className="text-emerald-400">{coach?.name ?? '—'}</span></div>
                  <div className="flex justify-between"><span>Venc.:</span><span className="text-slate-200">Dia {s.due_day}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap justify-end gap-2">
                  <button onClick={() => onOpenWhatsApp(s)} className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300">WhatsApp</button>
                  {canViewHealth && <button onClick={() => onOpenProntuario(s)} className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200">Avaliação</button>}
                  {canViewWorkouts && <button onClick={() => onNavigateToWorkout(s.id)} className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200">Treinos</button>}
                  {canUpdate && <button onClick={() => onEditStudent(s)} className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200">Editar</button>}
                  {canDelete && <button onClick={() => onDeleteStudent(s.id)} className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">Remover</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
