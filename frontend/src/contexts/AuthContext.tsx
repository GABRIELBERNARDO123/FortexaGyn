import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '../lib/api';

// ===== TIPOS (espelham os schemas do backend) =====

export interface UserPublic {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  access_profile: 'read_only' | 'operational' | 'operations_admin' | 'tablet_checkin';
  status: 'active' | 'blocked';
  created_at: string;
}

export interface TenantPublic {
  id: string;
  name: string;
  status: 'active' | 'suspended';
}

export interface MeResponse {
  user: UserPublic;
  tenant: TenantPublic;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ActivatePayload {
  activation_code: string;
  tenant_name: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
}

// ===== CONTEXTO =====

interface AuthContextValue {
  user: UserPublic | null;
  tenant: TenantPublic | null;
  loading: boolean;      // true enquanto verifica /auth/me no boot
  login: (payload: LoginPayload) => Promise<void>;
  activate: (payload: ActivatePayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>('/auth/me');
      setUser(me.user);
      setTenant(me.tenant);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
        setTenant(null);
      } else {
        console.error('Erro ao verificar sessão:', err);
        setUser(null);
        setTenant(null);
      }
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const me = await api.post<MeResponse>('/auth/login', payload);
    setUser(me.user);
    setTenant(me.tenant);
  }, []);

  const activate = useCallback(async (payload: ActivatePayload) => {
    // Resposta do /auth/activate é ActivateResponse (user + tenant + message)
    const resp = await api.post<MeResponse & { message?: string }>(
      '/auth/activate',
      payload,
    );
    setUser(resp.user);
    setTenant(resp.tenant);
  }, []);

  const logout = useCallback(async () => {
    // Só descarta o estado local após o servidor confirmar a revogação.
    // Se a rede falhar, a UI permite repetir e não afirma que a sessão foi encerrada.
    await api.post('/auth/logout');
    setUser(null);
    setTenant(null);
  }, []);

  // No boot, tenta restaurar a sessão a partir do cookie
  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, tenant, loading, login, activate, logout, refresh }),
    [user, tenant, loading, login, activate, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
