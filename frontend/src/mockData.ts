import { Student, Product, CashFlowTransaction, Coach, GymConfig, SaleRecord } from './types';

export const initialCoaches: Coach[] = [
  { id: 'c-1', name: 'Prof. Gabriel Siqueira', specialty: 'Musculação & Hipertrofia', phone: '11981112233' },
  { id: 'c-2', name: 'Profa. Mariana Becker', specialty: 'Treinamento Funcional & Saúde', phone: '11982223344' },
  { id: 'c-3', name: 'Prof. Ricardo Santos', specialty: 'Reabilitação & Biomecânica', phone: '11983334455' },
  { id: 'c-4', name: 'Profa. Camila Duarte', specialty: 'Condicionamento & Emagrecimento', phone: '11984445566' }
];

export const initialConfig: GymConfig = {
  gymName: 'FortexaGym Club Academia',
  pixKey: 'financeiro@fitproclub.com.br',
  pixName: 'FortexaGym Club Gestão Fitness Ltda',
  phone: '11987654321',
  address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP'
};

export const initialProducts: Product[] = [
  { id: 'p-1', name: 'Whey Protein Isolado 900g (Dux)', category: 'Suplementos', price: 169.90, cost: 110.00, stock: 14, minStock: 4 },
  { id: 'p-2', name: 'Creatina Creapure 300g (Growth)', category: 'Suplementos', price: 95.00, cost: 58.00, stock: 3, minStock: 5 },
  { id: 'p-3', name: 'Pré-Treino Panic 300g (Adaptogen)', category: 'Suplementos', price: 119.00, cost: 72.00, stock: 8, minStock: 3 },
  { id: 'p-4', name: 'Barra de Proteína Crisp Bar 45g', category: 'Suplementos', price: 14.50, cost: 7.20, stock: 45, minStock: 10 },
  { id: 'p-5', name: 'Garrafa Squeeze Térmica Inox 750ml', category: 'Acessórios', price: 49.90, cost: 22.00, stock: 22, minStock: 6 },
  { id: 'p-6', name: 'Camiseta Dry-Fit FortexaGym Oficial', category: 'Vestuário', price: 69.90, cost: 32.00, stock: 18, minStock: 5 },
  { id: 'p-7', name: 'Bebida Energética Ultra Zero 473ml', category: 'Bebidas', price: 11.00, cost: 5.50, stock: 28, minStock: 8 },
  { id: 'p-8', name: 'Strap de Treino de Alta Resistência', category: 'Acessórios', price: 35.00, cost: 15.00, stock: 1, minStock: 3 }
];

const todayStr = '2026-10-07';

export const initialStudents: Student[] = [
  { id: 's-1', name: 'Lucas Andrade', phone: '11988887777', birthDate: '1998-10-07', coach: 'Prof. Gabriel Siqueira',
    medicalRecord: 'Lombalgia crônica (L4-L5). Evitar sobrecarga vertical.', workoutTime: '07:30',
    workoutDays: ['Seg', 'Qua', 'Sex'], plan: 'Mensal', price: 139.90, dueDay: 5, status: 'Ativo',
    lastPaymentDate: '2026-10-02', attendance: [`${todayStr} 07:28`], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-01-10' },
  { id: 's-2', name: 'Mariana Costa Ferreira', phone: '11977776666', birthDate: '1995-10-22', coach: 'Profa. Mariana Becker',
    medicalRecord: 'Condromalácia patelar grau II.', workoutTime: '18:00',
    workoutDays: ['Seg', 'Qua', 'Qui', 'Sex'], plan: 'Trimestral', price: 359.00, dueDay: 15, status: 'Ativo',
    lastPaymentDate: '2026-09-14', attendance: [], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-03-12' },
  { id: 's-3', name: 'Rodrigo Henrique Lima', phone: '11966665555', birthDate: '1989-04-18', coach: 'Prof. Ricardo Santos',
    medicalRecord: 'Cirurgia no manguito rotador.', workoutTime: '19:30',
    workoutDays: ['Qua', 'Sex', 'Sáb'], plan: 'Mensal', price: 139.90, dueDay: 25, status: 'Ativo',
    lastPaymentDate: '2026-09-25', attendance: [], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-05-18' },
  { id: 's-4', name: 'Camila Guimarães Rocha', phone: '11955554444', birthDate: '2001-10-15', coach: 'Profa. Camila Duarte',
    medicalRecord: 'Sem restrições.', workoutTime: '06:30',
    workoutDays: ['Seg', 'Ter', 'Qui', 'Sex'], plan: 'Semestral', price: 660.00, dueDay: 10, status: 'Ativo',
    lastPaymentDate: '2026-10-01', attendance: [], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-06-20' },
  { id: 's-5', name: 'Eduardo Martins Viana', phone: '11944443333', birthDate: '1982-12-03', coach: 'Prof. Gabriel Siqueira',
    medicalRecord: 'Hipertenso controlado.', workoutTime: '12:00',
    workoutDays: ['Seg', 'Qua', 'Sex'], plan: 'Mensal', price: 139.90, dueDay: 1, status: 'Ativo',
    lastPaymentDate: '2026-09-01', attendance: [], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-02-14' },
  { id: 's-6', name: 'Beatriz Vasconcelos', phone: '11933332222', birthDate: '1997-03-29', coach: 'Profa. Mariana Becker',
    medicalRecord: 'Tendinite patelar antiga.', workoutTime: '17:00',
    workoutDays: ['Ter', 'Qui', 'Sáb'], plan: 'Anual', price: 1190.00, dueDay: 8, status: 'Ativo',
    lastPaymentDate: '2026-01-08', attendance: [], evaluations: [],
    workouts: { A: { name: 'Treino A', exercises: [] } }, createdAt: '2026-01-08' }
];

export const initialSales: SaleRecord[] = [];

export const initialCashFlow: CashFlowTransaction[] = [
  { id: 'cf-1', date: '2026-10-07T09:15:00', type: 'entrada', category: 'Venda Loja', description: 'Venda PDV #1001 (Lucas Andrade)', amount: 40.00, paymentMethod: 'PIX' },
  { id: 'cf-2', date: '2026-10-02T10:00:00', type: 'entrada', category: 'Mensalidade', description: 'Mensalidade Outubro - Lucas Andrade', amount: 139.90, paymentMethod: 'PIX' },
  { id: 'cf-3', date: '2026-10-05T08:00:00', type: 'saida', category: 'Aluguel', description: 'Aluguel do Galpão Comercial - Outubro', amount: 3200.00, paymentMethod: 'Boleto' },
  { id: 'cf-4', date: '2026-10-04T14:00:00', type: 'saida', category: 'Manutenção', description: 'Manutenção de cabos nos aparelhos', amount: 450.00, paymentMethod: 'PIX' }
];
