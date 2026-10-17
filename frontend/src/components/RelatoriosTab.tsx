import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Trash2, Edit, Download, RefreshCw, X, Paperclip, Eye } from 'lucide-react';
import { api } from '../lib/api';

type Report = { 
  id: string; title: string; content: string; 
  file_name?: string | null; file_type?: string | null; file_data?: string | null;
  created_at: string; 
};

export function RelatoriosTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Controle de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState<Report | null>(null);
  
  // Estados do Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setReports(await api.get<Report[]>('/reports')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      await api.post('/reports/generate');
      await load();
    } catch (e: any) { setError(e.message || 'Erro ao gerar'); }
    finally { setGenerating(false); }
  };

  const openNewForm = () => {
    setEditingId(null); setTitle(''); setContent(''); setFileBase64(null); setFileName(null); setFileType(null);
    setIsCreateOpen(true);
  };

  const openEditForm = (r: Report) => {
    setEditingId(r.id); setTitle(r.title); setContent(r.content); setFileBase64(r.file_data || null); setFileName(r.file_name || null); setFileType(r.file_type || null);
    setIsCreateOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('Arquivo muito grande (máx 5MB)');
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
      setFileName(file.name);
      setFileType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { title, content, file_name: fileName, file_type: fileType, file_data: fileBase64 };
      if (editingId) await api.patch(`/reports/${editingId}`, payload);
      else await api.post('/reports', payload);
      
      setIsCreateOpen(false);
      await load();
    } catch (e: any) { setError(e.message || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apagar este relatório?')) return;
    await api.delete(`/reports/${id}`);
    await load();
  };

  const downloadTxt = (r: Report) => {
    const blob = new Blob([r.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${r.title.replace(/\s+/g, '_')}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const openAttachment = (r: Report) => {
    if (!r.file_data || !r.file_type) return;
    const byteCharacters = atob(r.file_data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: r.file_type });
    const url = URL.createObjectURL(blob);
    
    if (r.file_type.includes('pdf') || r.file_type.includes('text')) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a'); a.href = url; a.download = r.file_name || 'anexo'; a.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2"><FileText className="text-emerald-400" /> Relatórios</h2>
        <div className="flex gap-2">
          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold disabled:opacity-50 hover:bg-emerald-400 transition">
            <RefreshCw className={generating ? "animate-spin" : ""} size={14} /> Gerar Automático
          </button>
          <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition">
            <Plus size={14} /> Criar Manual
          </button>
        </div>
      </div>

      {error && <div className="text-rose-400 text-xs bg-rose-500/10 p-3 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.id} className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200 line-clamp-2">{r.title}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
              {r.file_name && <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><Paperclip size={10}/> {r.file_name}</p>}
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/60 flex-wrap">
              <button onClick={() => setIsViewOpen(r)} className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1"><Eye size={12}/> Ler</button>
              {r.file_name && <button onClick={() => openAttachment(r)} className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white flex items-center justify-center gap-1"><Paperclip size={12}/> Anexo</button>}
              <button onClick={() => openEditForm(r)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"><Edit size={14} /></button>
              <button onClick={() => downloadTxt(r)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200" title="Baixar .txt"><Download size={14} /></button>
              <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {reports.length === 0 && !loading && <p className="text-slate-400 text-sm col-span-full text-center py-10">Nenhum relatório gerado ainda.</p>}
      </div>

      {/* Modal Visualizar */}
      {isViewOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white">{isViewOpen.title}</h3>
              <button type="button" onClick={() => setIsViewOpen(null)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <pre className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">{isViewOpen.content}</pre>
            <div className="flex justify-end gap-2 pt-2">
              {isViewOpen.file_name && <button type="button" onClick={() => openAttachment(isViewOpen)} className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold flex gap-2 items-center"><Paperclip size={16}/> Ver Anexo</button>}
              <button type="button" onClick={() => window.print()} className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold">Imprimir / PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar/Criar */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white">{editingId ? 'Editar Relatório' : 'Novo Relatório'}</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do Relatório" className="w-full text-sm rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
            <textarea required value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="Digite aqui o conteúdo ou deixe em branco se for usar apenas anexo." className="w-full text-sm rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 font-mono resize-none" />
            
            {/* Upload Area */}
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt,.doc,.docx" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold">
                <Paperclip size={14} /> Anexar Arquivo
              </button>
              {fileName && <span className="text-xs text-emerald-400 truncate max-w-xs">{fileName}</span>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 text-sm font-bold">Cancelar</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold">Salvar Relatório</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
