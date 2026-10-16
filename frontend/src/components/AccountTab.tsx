import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LogOut, RefreshCw, ShieldCheck, UserPlus, UserRound, Users, X } from 'lucide-react';
import { api, type ApiError } from '../lib/api';
import type { TenantPublic, UserPublic } from '../contexts/AuthContext';
import { profileLabels } from '../lib/permissions';

type AccountData = {
  id: string; name: string; status: 'active' | 'suspended'; created_at: string;
  owner: UserPublic; additional_users: UserPublic[];
};

const descriptions = {
  read_only: 'Consulta dados básicos de alunos, professores, check-ins, treinos e produtos. Sem finanças, dados de saúde, escrita ou exportação.',
  operational: 'Recepção: consulta e cadastra alunos, faz check-in, opera a loja/PDV e vê fichas de treino. Sem finanças, avaliações, professores ou administração.',
  operations_admin: 'Acesso de leitura, cadastro, edição e exclusão nos módulos operacionais, incluindo avaliações de saúde. Não administra usuários ou a conta.',
  tablet_checkin: 'Tablet de recepção: acesso restrito à tela de check-in (buscar aluno e confirmar chegada). Não vê menus nem dados administrativos.',
} as const;

const field = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none';
const panel = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5';

function errorMessage(error: unknown) {
  const detail = (error as ApiError)?.detail;
  return typeof detail === 'string' ? detail : error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export function AccountTab({ user, tenant, onLogout, onRefresh }: {
  user: UserPublic; tenant: TenantPublic; onLogout: () => Promise<void>; onRefresh: () => Promise<void>;
}) {
  const isOwner = user.role === 'owner';
  const [account, setAccount] = useState<AccountData | null>(null);
  const [name, setName] = useState(tenant.name);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [profile, setProfile] = useState<UserPublic['access_profile']>('operational');
  const [memberTheme, setMemberTheme] = useState<'' | 'dark' | 'light' | 'minimal'>('');
  const [loading, setLoading] = useState(isOwner);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true); setError('');
    try {
      const data = await api.get<AccountData>('/account');
      setAccount(data); setName(data.name);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }, [isOwner]);

  useEffect(() => { void load(); }, [load]);

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/account', { name });
      await onRefresh(); await load(); setSuccess('Nome da conta atualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const createMember = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/users', { name: memberName, email: memberEmail, password: memberPassword, access_profile: profile, theme: memberTheme || null });
      setMemberName(''); setMemberEmail(''); setMemberPassword(''); setMemberTheme('');
      await load(); setSuccess('Usuário criado. Combine a senha inicial por um canal seguro.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const createQuick = (kind: 'recepcao' | 'tablet') => {
    setProfile(kind === 'recepcao' ? 'operational' : 'tablet_checkin');
    setMemberName(kind === 'recepcao' ? 'Recepção' : 'Tablet Recepção');
    setMemberEmail('');
    setMemberPassword('');
    setError(''); setSuccess('');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const updateTheme = async (member: UserPublic, next: 'dark' | 'light' | 'minimal' | null) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch(`/users/${member.id}`, { theme: next });
      await load(); setSuccess('Tema atualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const updateProfile = async (member: UserPublic, next: UserPublic['access_profile']) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch(`/users/${member.id}`, { access_profile: next });
      await load(); setSuccess('Permissões atualizadas. As próximas requisições aplicarão o novo perfil.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const revokeMember = async (member: UserPublic) => {
    if (!window.confirm(`Revogar o acesso de ${member.name}? As sessões ativas serão encerradas.`)) return;
    setSaving(true); setError(''); setSuccess('');
    try { await api.delete(`/users/${member.id}`); await load(); setSuccess('Acesso revogado e sessões encerradas.'); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const handleLogout = async (switchAccount = false) => {
    if (!window.confirm(switchAccount ? 'Encerrar esta sessão e voltar ao login para entrar em outra conta?' : 'Sair desta conta? A sessão será encerrada no servidor.')) return;
    setSaving(true); setError('');
    try { await onLogout(); }
    catch (cause) { setError(`O servidor não confirmou o logout. Tente novamente. ${errorMessage(cause)}`); }
    finally { setSaving(false); }
  };

  const members = account?.additional_users ?? [];
  const atLimit = members.length >= 2;

  return (
    <section className="mx-auto max-w-4xl space-y-4" aria-labelledby="account-title">
      <header className={`${panel} flex items-center justify-between gap-3`}>
        <div><h2 id="account-title" className="text-lg font-bold text-white">Conta</h2><p className="mt-1 text-sm text-slate-400">Gerencie a academia, os acessos e sua sessão.</p></div>
        {isOwner && <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Atualizar dados da conta"><RefreshCw size={17} /></button>}
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div>}
      {loading && <div role="status" className={`${panel} text-center text-sm text-slate-400`}>Carregando conta…</div>}

      {!loading && <>
        <form onSubmit={saveAccount} className={`${panel} space-y-4`}>
          <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-400" size={19} /><h3 className="font-bold text-white">Dados da conta</h3></div>
          <label className="block space-y-1 text-sm text-slate-300">Nome da academia
            <input className={field} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} minLength={2} readOnly={!isOwner} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl bg-slate-800/70 p-3"><span className="text-xs text-slate-400">Situação</span><p className="mt-1 text-slate-100">{(account?.status || tenant.status) === 'active' ? 'Ativa' : 'Suspensa'}</p></div>
            {isOwner && account && <div className="rounded-xl bg-slate-800/70 p-3"><span className="text-xs text-slate-400">Identificador interno</span><p className="mt-1 break-all font-mono text-xs text-slate-200">{account.id}</p></div>}
          </div>
          {account && <div className="rounded-xl bg-slate-800/70 p-3 text-sm"><span className="text-xs text-slate-400">Proprietário</span><p className="mt-1 text-slate-100">{account.owner.name} · {account.owner.email}</p></div>}
          {isOwner && <button disabled={saving || name.trim().length < 2 || name === account?.name} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar dados da conta'}</button>}
        </form>

        <section className={`${panel} space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Users className="text-emerald-400" size={19} /><h3 className="font-bold text-white">Usuários adicionais</h3></div>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{members.length}/2</span>
          </div>

          {isOwner ? <>
            {!atLimit && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => createQuick('recepcao')} disabled={saving || members.some(m => m.access_profile === 'operational')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
                  <UserPlus size={14} /> Criar recepção
                </button>
                <button type="button" onClick={() => createQuick('tablet')} disabled={saving || members.some(m => m.access_profile === 'tablet_checkin')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
                  <UserPlus size={14} /> Criar tablet
                </button>
              </div>
            )}

            {members.length > 0 && (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-100">{member.name}</p>
                        <p className="text-sm text-slate-400">{member.email} · {member.status === 'active' ? 'Ativo' : 'Revogado'}</p>
                      </div>
                      <span className="text-xs text-emerald-300">{profileLabels[member.access_profile]}</span>
                    </div>
                    {member.status === 'active' && (
                      <>
                        <label className="block space-y-1 text-sm text-slate-300">Perfil de acesso
                          <select className={field} value={member.access_profile} disabled={saving} onChange={(event) => void updateProfile(member, event.target.value as UserPublic['access_profile'])}>
                            {Object.entries(profileLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                          </select>
                        </label>
                        <p className="text-xs leading-relaxed text-slate-400">{descriptions[member.access_profile]}</p>
                        <label className="block space-y-1 text-sm text-slate-300">Tema (Aparência)
                          <select className={field} value={member.theme ?? ''} disabled={saving} onChange={(event) => void updateTheme(member, event.target.value === '' ? null : (event.target.value as 'dark' | 'light' | 'minimal'))}>
                            <option value="">Livre (usuário escolhe)</option>
                            <option value="dark">Escuro</option>
                            <option value="light">Claro</option>
                            <option value="minimal">Minimal</option>
                          </select>
                        </label>
                        <button type="button" disabled={saving} onClick={() => void revokeMember(member)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="mr-1 inline" size={15} />Revogar acesso</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!atLimit && (
              <form onSubmit={createMember} className="grid gap-3 sm:grid-cols-2">
                <p className="text-sm text-slate-400 sm:col-span-2">{members.length === 0 ? 'Nenhum usuário adicional ativo. Crie um para a recepção ou o tablet.' : 'Você ainda tem 1 vaga. Preencha para criar outro acesso.'}</p>
                <label className="space-y-1 text-sm text-slate-300">Nome<input required minLength={2} maxLength={120} className={field} value={memberName} onChange={(e) => setMemberName(e.target.value)} /></label>
                <label className="space-y-1 text-sm text-slate-300">E-mail<input required type="email" className={field} value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} /></label>
                <label className="space-y-1 text-sm text-slate-300 sm:col-span-2">Senha inicial (mínimo 12 caracteres)<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" className={field} value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} /></label>
                <label className="space-y-1 text-sm text-slate-300 sm:col-span-2">Perfil
                  <select className={field} value={profile} onChange={(e) => setProfile(e.target.value as UserPublic['access_profile'])}>{Object.entries(profileLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                </label>
                <label className="space-y-1 text-sm text-slate-300 sm:col-span-2">Tema (Aparência)
                  <select className={field} value={memberTheme} onChange={(e) => setMemberTheme(e.target.value as '' | 'dark' | 'light' | 'minimal')}>
                    <option value="">Livre (usuário escolhe)</option>
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
                <p className="text-xs leading-relaxed text-slate-400 sm:col-span-2">{descriptions[profile]} Compartilhe a senha inicial por canal seguro.</p>
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50 sm:col-span-2"><UserPlus size={16} />{saving ? 'Criando…' : 'Adicionar usuário'}</button>
              </form>
            )}
          </> : (
            <div className="rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">
              <p className="font-semibold"><UserRound size={16} className="mr-2 inline text-emerald-400" />Seu acesso</p>
              <p className="mt-2">Perfil: {profileLabels[user.access_profile]}</p>
              <p className="mt-1 text-xs text-slate-400">{descriptions[user.access_profile]}</p>
              <p className="mt-2 text-xs text-slate-500">A administração da conta e dos usuários é exclusiva do proprietário.</p>
            </div>
          )}
        </section>

        <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div><h3 className="font-bold text-white">Sessão atual</h3><p className="mt-1 text-sm text-slate-400">{user.name} · {user.email} · {isOwner ? 'Proprietário' : profileLabels[user.access_profile]}</p><p className="text-xs text-slate-500">Autenticação por cookie seguro gerenciado pelo servidor.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void handleLogout(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><LogOut size={16} />Sair da conta</button><button type="button" onClick={() => void handleLogout(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Trocar de conta</button></div>
        </section>
      </>}
    </section>
  );
}