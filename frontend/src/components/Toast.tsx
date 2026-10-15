import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage { id: string; type: 'success' | 'warning' | 'info'; message: string; }
interface Props { toasts: ToastMessage[]; onRemove: (id: string) => void; }

export const ToastContainer: React.FC<Props> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    {toasts.map((toast) => (
      <div key={toast.id} className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-slate-900 text-emerald-300 border-emerald-500/40' : toast.type === 'warning' ? 'bg-slate-900 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-sky-300 border-sky-500/40'}`}>
        <div className="flex items-center gap-2.5">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          <span className="leading-snug">{toast.message}</span>
        </div>
        <button onClick={() => onRemove(toast.id)} className="text-slate-400 hover:text-white p-0.5 rounded transition shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    ))}
  </div>
);
