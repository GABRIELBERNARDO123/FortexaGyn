import { DayOfWeek, Student } from './types';

export const dayNamesMap: Record<number, DayOfWeek> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

export const weekDaysList: DayOfWeek[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoStr; }
}

export function getDayOfWeekAbbr(date: Date = new Date()): DayOfWeek {
  return dayNamesMap[date.getDay()] || 'Seg';
}

export function isStudentScheduledOnDate(student: Student, targetDate: Date): boolean {
  if (!student.workoutDays || student.workoutDays.length === 0) return false;
  const dayAbbr = dayNamesMap[targetDate.getDay()];
  return student.workoutDays.includes(dayAbbr);
}

export function isStudentPaymentUpToDate(student: Student, checkDate: Date = new Date()): boolean {
  if (!student.lastPaymentDate) return false;
  const lastPay = new Date(student.lastPaymentDate + 'T00:00:00');
  const target = new Date(checkDate);
  if (lastPay.getFullYear() === target.getFullYear() && lastPay.getMonth() === target.getMonth()) return true;
  if (lastPay.getFullYear() === target.getFullYear() && lastPay.getMonth() === target.getMonth() - 1 && target.getDate() <= student.dueDay) return true;
  return false;
}

export function getStudentAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split('-');
  if (parts.length < 3) return null;
  const birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function isBirthdayToday(birthDateStr: string, refDate: Date = new Date()): boolean {
  if (!birthDateStr) return false;
  const [, month, day] = birthDateStr.split('-').map(Number);
  return refDate.getMonth() + 1 === month && refDate.getDate() === day;
}

export function isBirthdayThisMonth(birthDateStr: string, refDate: Date = new Date()): boolean {
  if (!birthDateStr) return false;
  const [, month] = birthDateStr.split('-').map(Number);
  return refDate.getMonth() + 1 === month;
}

export function hasStudentCheckedInOnDate(student: Student, dateStrYMD: string): boolean {
  if (!student.attendance || student.attendance.length === 0) return false;
  return student.attendance.some((item) => item.startsWith(dateStrYMD));
}

export function getStudentCheckInTime(student: Student, dateStrYMD: string): string | null {
  if (!student.attendance) return null;
  const record = student.attendance.find((item) => item.startsWith(dateStrYMD));
  if (!record) return null;
  const parts = record.split(' ');
  return parts.length > 1 ? parts[1] : 'Presente';
}
