/**
 * Cliente HTTP para a API FastAPI.
 * - Envia cookies (credentials: 'include').
 * - Lança ApiError em respostas HTTP 4xx/5xx.
 * - Preserva o payload completo (detail + erros).
 */

export class ApiError extends Error {
  status: number;
  detail: unknown;
  erros?: { campo: string; problema: string; exemplo: string }[];

  constructor(status: number, payload: any) {
    let msg = `HTTP ${status}`;
    if (typeof payload === 'string') {
      msg = payload;
    } else if (payload?.detail && typeof payload.detail === 'string') {
      msg = payload.detail;
    }

    super(msg);
    this.status = status;
    this.detail = payload?.detail || payload;
    this.erros = payload?.erros;
  }
}

const API_BASE = '/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_BASE + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    // Passa o objeto inteiro (com detail e erros) para o ApiError
    throw new ApiError(response.status, data || text);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ===== TIPOS DAS ENTIDADES =====
export interface Coach {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'desistente';
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  birth_date: string;
  medical_record: string | null;
  workout_time: string | null;
  workout_days: string[];
  plan: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  price: number;
  due_day: number;
  status: 'active' | 'inactive' | 'desistente';
  coach_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  created_at: string;
}

export interface CoachInput {
  name: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: 'active' | 'inactive' | 'desistente';
}

export interface StudentInput {
  name: string;
  phone: string;
  birth_date: string;
  medical_record?: string;
  workout_time?: string | null;
  workout_days?: string[];
  plan?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  price?: number;
  due_day?: number;
  status?: 'active' | 'inactive' | 'desistente';
  coach_id?: string | null;
}

export interface ProductInput {
  name: string;
  category?: string;
  price: number;
  cost?: number;
  stock?: number;
  min_stock?: number;
}

// ===== CLIENTES POR ENTIDADE =====
export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) =>
    request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  coaches: {
    list: () => request<Coach[]>('/coaches'),
    create: (data: CoachInput) => request<Coach>('/coaches', { method: 'POST', body: data }),
    update: (id: string, data: Partial<CoachInput>) =>
      request<Coach>(`/coaches/${id}`, { method: 'PATCH', body: data }),
    remove: (id: string) => request<void>(`/coaches/${id}`, { method: 'DELETE' }),
  },

  students: {
    list: (coachId?: string) =>
      request<Student[]>('/students', { query: coachId ? { coach_id: coachId } : undefined }),
    create: (data: StudentInput) => request<Student>('/students', { method: 'POST', body: data }),
    update: (id: string, data: Partial<StudentInput>) =>
      request<Student>(`/students/${id}`, { method: 'PATCH', body: data }),
    remove: (id: string) => request<void>(`/students/${id}`, { method: 'DELETE' }),
  },

  products: {
    list: () => request<Product[]>('/products'),
    create: (data: ProductInput) => request<Product>('/products', { method: 'POST', body: data }),
    update: (id: string, data: Partial<ProductInput>) =>
      request<Product>(`/products/${id}`, { method: 'PATCH', body: data }),
    remove: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  },
};
