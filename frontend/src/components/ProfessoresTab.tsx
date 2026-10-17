import { useState } from 'react';
import type { Coach, Student } from '../lib/api';

interface Props {
  coaches: Coach[];
  students: Student[];
  isDarkMode: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onSaveCoach: (data: { name: string; specialty: string; phone: string; email: string }, id?: string) => Promise<void>;
  onDeleteCoach: (id: string) => void;
  onOpenWhatsApp: (coach: Coach) => void;
}

export function ProfessoresTab({ coaches, students, isDarkMode, canCreate, canUpdate, canDelete, onSaveCoach, onDeleteCoach, onOpenWhatsApp }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [coachToEdit, setCoachToEdit] = useState<Coach | null>(null);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const openNew = () => { setCoachToEdit(null); setName(''); setSpecialty(''); setPhone(''); setEmail(''); setError(''); setFieldErrors({}); setIsOpen(true); };
  const openEdit = (coach: Coach) => { setCoachToEdit(coach); setName(coach.name); setSpecialty(coach.specialty || ''); setPhone(coach.phone || ''); setEmail(coach.email || ''); setError(''); setFieldErrors({}); setIsOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(''); setFieldErrors({});
    try {
      // Manda email normal agora (obrigatório)
      await onSaveCoach({ name: name.trim(), specialty: specialty.trim(), phone: phone.trim(), email: email.trim() }, coachToEdit?.id);
      setIsOpen(false); setCoachToEdit(null);
    } catch (cause: any) {
      // Tenta pegar os erros do backend. (O App.tsx precisa repassar o cause inteiro)
      const detail = cause?.detail;
      const erros = cause?.erros || cause?.response?.data?.erros; 
      
      if (Array.isArray(erros) && erros.length > 0) {
        const mapa: Record<string, string> = {};
        erros.forEach((err: any) => {
          mapa[err.campo] = `${err.problema} (Ex: ${err.exemplo})`;
        });
        setFieldErrors(mapa);
        setError('Verifique os campos destacados abaixo.');
      } else {
        setError(typeof detail === 'string' ? detail : cause?.message || 'Não foi possível salvar o professor.');
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-bold">Corpo Docente ({coaches.length})</h3>
        {canCreate && <button onClick={openNew} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950">+ Novo Professor</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.map((c) => {
          const assigned = students.filter((s) => s.coach_id === c.id);
          return (
            <div key={c.id} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm mb-2">
                {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <h4 className="font-bold text-sm">{c.name}</h4>
              <p className="text-xs text-emerald-400">{c.specialty || 'Sem especialidade'}</p>
              <div className="mt-3 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between"><span>Alunos:</span><span className="text-slate-200 font-bold">{assigned.length}</span></div>
                {c.phone && <div className="flex justify-between"><span>Tel:</span><span className="text-slate-200">{c.phone}</span></div>}
                {c.email && <div className="flex justify-between"><span>Email:</span><span className="text-slate-200 truncate">{c.email}</span></div>}
              </div>
              {(c.phone || canUpdate || canDelete) && <div className="mt-3 flex flex-wrap gap-2">{c.phone && <button onClick={() => onOpenWhatsApp(c)} className="flex-1 py-1.5 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300">WhatsApp</button>}{canUpdate && <button onClick={() => openEdit(c)} className="flex-1 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200">Editar</button>}{canDelete && <button onClick={() => onDeleteCoach(c.id)} className="flex-1 py-1.5 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">Remover</button>}</div>}
            </div>
          );
        })}
      </div>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form noValidate onSubmit={handleSave} className={`w-full max-w-md rounded-2xl border p-5 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <h4 className="font-bold text-sm">{coachToEdit ? 'Editar Professor' : 'Cadastrar Professor'}</h4>
            
            <div>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className={`w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border ${fieldErrors.name ? 'border-rose-500' : 'border-slate-700'} text-slate-100`} />
              {fieldErrors.name && <span className="text-[10px] text-rose-400 font-bold ml-1">{fieldErrors.name}</span>}
            </div>

            <div>
              <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Especialidade" className={`w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border ${fieldErrors.specialty ? 'border-rose-500' : 'border-slate-700'} text-slate-100`} />
              {fieldErrors.specialty && <span className="text-[10px] text-rose-400 font-bold ml-1">{fieldErrors.specialty}</span>}
            </div>

            <div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className={`w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border ${fieldErrors.phone ? 'border-rose-500' : 'border-slate-700'} text-slate-100`} />
              {fieldErrors.phone && <span className="text-[10px] text-rose-400 font-bold ml-1">{fieldErrors.phone}</span>}
            </div>

            <div>
              {/* Agora o email é required no HTML e visual */}
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={`w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border ${fieldErrors.email ? 'border-rose-500' : 'border-slate-700'} text-slate-100`} />
              {fieldErrors.email && <span className="text-[10px] text-rose-400 font-bold ml-1">{fieldErrors.email}</span>}
            </div>

            {error && <div role="alert" className="text-xs bg-rose-500/10 text-rose-300 p-2 rounded-xl">{error}</div>}
            
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400">Cancelar</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
