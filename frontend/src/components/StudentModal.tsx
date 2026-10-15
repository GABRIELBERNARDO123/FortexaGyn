import { useState, useEffect } from 'react';
import type { Coach, Student } from '../lib/api';

const workoutWeekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Student>) => void;
  studentToEdit: Student | null;
  coaches: Coach[];
  isDarkMode: boolean;
}

export function StudentModal({ isOpen, onClose, onSave, studentToEdit, coaches }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState('');
  const [plan, setPlan] = useState<'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensal');
  const [price, setPrice] = useState('139.90');
  const [dueDay, setDueDay] = useState('10');
  const [coachId, setCoachId] = useState<string>('');
  const [medicalRecord, setMedicalRecord] = useState('');
  const [workoutTime, setWorkoutTime] = useState('');
  const [workoutDays, setWorkoutDays] = useState<string[]>([]);

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name); setPhone(studentToEdit.phone); setBirth(studentToEdit.birth_date);
      setPlan(studentToEdit.plan); setPrice(String(studentToEdit.price)); setDueDay(String(studentToEdit.due_day));
      setCoachId(studentToEdit.coach_id ?? '');
      setMedicalRecord(studentToEdit.medical_record || '');
      setWorkoutTime(studentToEdit.workout_time || '');
      setWorkoutDays(studentToEdit.workout_days || []);
    } else {
      setName(''); setPhone(''); setBirth(''); setPlan('Mensal'); setPrice('139.90'); setDueDay('10');
      setCoachId(coaches[0]?.id ?? '');
      setMedicalRecord(''); setWorkoutTime(''); setWorkoutDays([]);
    }
  }, [studentToEdit, coaches, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !birth) return;
    onSave({
      name: name.trim(), phone: phone.trim(), birth_date: birth, plan,
      price: parseFloat(price) || 0, due_day: parseInt(dueDay) || 10,
      coach_id: coachId || null,
      medical_record: medicalRecord.trim(), workout_time: workoutTime || null, workout_days: workoutDays,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h4 className="font-bold text-white text-sm">{studentToEdit ? 'Editar' : 'Novo'} Aluno</h4>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        <input required type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-bold text-slate-400">Horário de treino<input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} className="mt-1 w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" /></label>
          <label className="text-[11px] font-bold text-slate-400">Professor<select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="mt-1 w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100"><option value="">Sem professor</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        <fieldset className="rounded-xl border border-slate-800 p-3"><legend className="px-1 text-[11px] font-bold text-slate-400">Dias de treino</legend><div className="flex flex-wrap gap-x-3 gap-y-2">{workoutWeekdays.map((day) => <label key={day} className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={workoutDays.includes(day)} onChange={(e) => setWorkoutDays((current) => e.target.checked ? [...current, day] : current.filter((value) => value !== day))} />{day}</label>)}</div></fieldset>
        <label className="block text-[11px] font-bold text-slate-400">Prontuário / observações médicas<textarea maxLength={5000} rows={3} value={medicalRecord} onChange={(e) => setMedicalRecord(e.target.value)} className="mt-1 w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" /></label>
        <div className="grid grid-cols-3 gap-2">
          <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100">
            <option value="Mensal">Mensal</option><option value="Trimestral">Trimestral</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option>
          </select>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço" className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
          <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Venc." className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950">Salvar</button>
        </div>
      </form>
    </div>
  );
}
