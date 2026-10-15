import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, api } from '../lib/api';

type Mode = 'login' | 'signup' | 'verify';

export function LoginScreen() {
  const { login, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupTenant, setSignupTenant] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Verify
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      await api.post('/auth/signup', {
        email: signupEmail,
        owner_name: signupName,
        tenant_name: signupTenant,
        password: signupPassword,
      });
      setVerifyEmail(signupEmail);
      setMode('verify');
      setSuccess('Código enviado! Verifique seu email.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      await api.post('/auth/verify-email', {
        email: verifyEmail,
        code: verifyCode,
      });
      // Após verificar, cria a sessão e o AuthContext vai detectar no /me
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-fort-full.png" alt="FortexaGym" className="w-40 h-40 object-contain" />
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-2">
            Fortexa<span className="text-orange-400">Gym</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Sistema de Gestão de Academia</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {mode !== 'verify' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700/60 mb-5">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${mode === 'login' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${mode === 'signup' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <i className="fa-solid fa-circle-check mt-0.5"></i>
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-md shadow-emerald-500/20 disabled:opacity-60">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome da Academia / Empresa</label>
                <input type="text" required minLength={2} maxLength={120} value={signupTenant} onChange={(e) => setSignupTenant(e.target.value)} placeholder="Minha Academia"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Seu Nome</label>
                <input type="text" required minLength={2} maxLength={120} value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Nome completo"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="seu@email.com"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha (mín. 8 caracteres)</label>
                <input type="password" required minLength={8} maxLength={128} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••"
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-md shadow-emerald-500/20 disabled:opacity-60">
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <i className="fa-solid fa-envelope-circle-check text-emerald-400 text-xl"></i>
                </div>
                <h3 className="text-sm font-bold text-white">Verifique seu Email</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enviamos um código de 6 dígitos para <strong className="text-slate-300">{verifyEmail}</strong>
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Código de Verificação</label>
                <input type="text" required minLength={6} maxLength={6} pattern="^\d{6}$" inputMode="numeric" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl px-3.5 py-3 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-md shadow-emerald-500/20 disabled:opacity-60">
                {loading ? 'Verificando...' : 'Confirmar Código'}
              </button>
              <button type="button" onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
                Voltar
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">
          Ao continuar, você concorda com os termos de uso.
        </p>
      </div>
    </div>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : String(d))).join(' • ');
    }
    return `Erro ${err.status}`;
  }
  if (err instanceof Error) return err.message;
  return 'Erro inesperado. Tente novamente.';
}