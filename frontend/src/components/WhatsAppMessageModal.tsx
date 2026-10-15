import { useEffect, useState } from 'react';
import { MessageCircle, RotateCcw, X } from 'lucide-react';
import { buildWhatsAppUrl, maskWhatsAppPhone, type WhatsAppRecipientKind, type WhatsAppTemplateId } from '../lib/whatsapp.js';

export interface WhatsAppDraft {
  recipientKind: WhatsAppRecipientKind;
  recipientName: string;
  phone: string;
  templateId: WhatsAppTemplateId;
  originalMessage: string;
}

interface Props {
  draft: WhatsAppDraft | null;
  isDarkMode: boolean;
  onClose: () => void;
}

export function WhatsAppMessageModal({ draft, isDarkMode, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMessage(draft?.originalMessage ?? '');
    setError('');
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [draft, onClose]);

  if (!draft) return null;

  const title = draft.recipientKind === 'student' ? 'Enviar mensagem para aluno' : 'Enviar mensagem para professor';
  const openWhatsApp = () => {
    const url = buildWhatsAppUrl(draft.phone, message);
    if (!url) {
      setError(!message.trim() ? 'Escreva uma mensagem antes de continuar.' : 'Não foi possível validar o telefone ou a mensagem.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title" className={`w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <h2 id="whatsapp-modal-title" className="flex items-center gap-2 text-base font-extrabold">
              <MessageCircle className="h-5 w-5 text-emerald-400" />{title}
            </h2>
            <p className="mt-2 text-xs text-slate-400">{draft.recipientName}</p>
            <p className="text-xs text-slate-500">{maskWhatsAppPhone(draft.phone)}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-2 p-5">
          <label htmlFor="whatsapp-message" className="block text-xs font-semibold text-slate-400">Mensagem (revise e edite antes de abrir o WhatsApp)</label>
          <textarea id="whatsapp-message" rows={7} maxLength={2000} value={message} onChange={(event) => { setMessage(event.target.value); setError(''); }} className={`w-full resize-y rounded-xl border px-3 py-3 text-sm leading-relaxed focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'}`} />
          <div className="flex min-h-5 items-center justify-between gap-3 text-[11px] text-slate-500">
            <span role="alert" className="text-amber-400">{error}</span><span>{message.length}/2000</span>
          </div>
          <p className="text-[11px] text-slate-500">O Fit Pro não envia a mensagem. O texto será aberto para você revisar e enviar no WhatsApp.</p>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 p-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => { setMessage(draft.originalMessage); setError(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"><RotateCcw className="h-3.5 w-3.5" />Restaurar mensagem original</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 sm:flex-none">Cancelar</button>
            <button type="button" onClick={openWhatsApp} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 sm:flex-none">Abrir WhatsApp</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
