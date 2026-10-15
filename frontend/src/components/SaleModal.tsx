import { useMemo, useState, type FormEvent } from 'react';
import type { Product, Student } from '../lib/api';
import { formatBRL } from '../utils';

interface Props {
  isOpen: boolean;
  products: Product[];
  students: Student[];
  onClose: () => void;
  onSave: (sale: { student_id: string | null; method: string; items: { product_id: string; quantity: number }[] }) => Promise<boolean>;
}

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none';

export function SaleModal({ isOpen, products, students, onClose, onSave }: Props) {
  const [studentId, setStudentId] = useState('');
  const [method, setMethod] = useState('pix');
  const [items, setItems] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);
  const available = products.filter((product) => product.stock > 0);
  const total = useMemo(() => items.reduce((sum, item) => sum + (products.find((p) => p.id === item.product_id)?.price || 0) * item.quantity, 0), [items, products]);

  if (!isOpen) return null;

  const addItem = () => {
    const unused = available.find((product) => !items.some((item) => item.product_id === product.id));
    if (unused) setItems((current) => [...current, { product_id: unused.id, quantity: 1 }]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) return;
    setSaving(true);
    try {
      const saved = await onSave({ student_id: studentId || null, method, items });
      if (saved) { setItems([]); setStudentId(''); setMethod('pix'); }
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-white">Registrar venda</h2><p className="mt-1 text-xs text-slate-400">O estoque e o fluxo de caixa serão atualizados pela API.</p></div><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800">✕</button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-300">Aluno (opcional)<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}><option value="">Venda avulsa</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold text-slate-300">Pagamento<select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de débito</option><option value="credito">Cartão de crédito</option></select></label>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const product = products.find((p) => p.id === item.product_id);
          return <div key={`${item.product_id}-${index}`} className="grid grid-cols-[1fr_5rem_auto] gap-2">
            <select required value={item.product_id} onChange={(e) => setItems((current) => current.map((row, i) => i === index ? { ...row, product_id: e.target.value } : row))} className={inputClass}>
              {available.filter((option) => option.id === item.product_id || !items.some((other, otherIndex) => otherIndex !== index && other.product_id === option.id)).map((option) => <option key={option.id} value={option.id}>{option.name} · {formatBRL(option.price)} · estoque {option.stock}</option>)}
            </select>
            <input required aria-label="Quantidade" type="number" min="1" max={product?.stock || 1} value={item.quantity} onChange={(e) => setItems((current) => current.map((row, i) => i === index ? { ...row, quantity: Math.max(1, Number(e.target.value)) } : row))} className={inputClass} />
            <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} aria-label="Remover item" className="rounded-xl px-3 text-rose-300 hover:bg-rose-500/10">Remover</button>
          </div>;
        })}
        {!available.length && <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-400">Não há produtos com estoque disponível.</p>}
        <button type="button" disabled={items.length >= available.length} onClick={addItem} className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 disabled:opacity-50">+ Adicionar produto</button>
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 pt-3"><span className="text-sm text-slate-400">Total</span><strong className="text-lg text-emerald-400">{formatBRL(total)}</strong></div>
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400">Cancelar</button><button type="submit" disabled={saving || !items.length} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Processando…' : 'Confirmar venda'}</button></div>
    </form>
  </div>;
}
