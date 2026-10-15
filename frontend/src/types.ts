export type AppTheme = 'dark' | 'light' | 'minimal';

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

export interface WorkoutGroup {
  name: string;
  exercises: Exercise[];
}

export interface EvaluationDocument {
  id: string;
  title: string;
  date: string;
  notes: string;
  fileName: string;
  fileType: string;
  fileData: string;
}

export type DayOfWeek = 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sáb' | 'Dom';

export interface Student {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  coach: string;
  medicalRecord: string;
  workoutTime: string;
  workoutDays: DayOfWeek[];
  plan: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  price: number;
  dueDay: number;
  status: 'Ativo' | 'Inativo';
  lastPaymentDate: string;
  attendance: string[];
  evaluations: EvaluationDocument[];
  workouts: Record<string, WorkoutGroup>;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Suplementos' | 'Bebidas' | 'Acessórios' | 'Vestuário' | 'Planos';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: 'produto' | 'mensalidade';
  studentId?: string;
}

export interface SaleRecord {
  id: string;
  date: string;
  buyerName: string;
  studentId?: string | null;
  items: CartItem[];
  paymentMethod: 'PIX' | 'Dinheiro' | 'Cartão de Débito' | 'Cartão de Crédito';
  total: number;
}

export type CashFlowType = 'entrada' | 'saida';

export interface CashFlowTransaction {
  id: string;
  date: string;
  type: CashFlowType;
  category: 'Mensalidade' | 'Venda Loja' | 'Diária/Avulso' | 'Aluguel' | 'Energia/Água' | 'Manutenção' | 'Salários/Comissões' | 'Estoque' | 'Outros';
  description: string;
  amount: number;
  paymentMethod: 'PIX' | 'Dinheiro' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Boleto' | 'Transferência';
  relatedStudentId?: string;
  relatedSaleId?: string;
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  phone: string;
}

export interface GymConfig {
  gymName: string;
  pixKey: string;
  pixName: string;
  phone: string;
  address: string;
}
