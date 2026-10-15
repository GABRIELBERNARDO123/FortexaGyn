import type { UserPublic } from '../contexts/AuthContext';

const grants: Record<UserPublic['access_profile'], ReadonlySet<string>> = {
  read_only: new Set(['students:read', 'coaches:read', 'checkins:read', 'workouts:read', 'products:read']),
  tablet_checkin: new Set([
    'checkins:read', 'checkins:create', 'students:read',
  ]),
  operational: new Set([
    'students:read', 'students:create', 'coaches:read',
    'checkins:read', 'checkins:create', 'workouts:read', 'workouts:create',
    'products:read', 'products:create', 'sales:read', 'sales:create',
  ]),
  operations_admin: new Set([
    'students:read', 'students:create', 'students:update', 'students:delete',
    'students:health_read', 'students:health_write', 'coaches:read', 'coaches:create',
    'coaches:update', 'coaches:delete', 'checkins:read', 'checkins:create', 'checkins:delete',
    'workouts:read', 'workouts:create', 'workouts:update', 'workouts:delete',
    'assessments:read', 'assessments:create', 'assessments:update', 'assessments:delete',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'sales:read', 'sales:create', 'sales:delete', 'finance:read', 'finance:create',
    'finance:update', 'finance:delete', 'reports:read', 'reports:read_operational',
  ]),
};

export function can(user: UserPublic | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return grants[user.access_profile]?.has(permission) ?? false;
}

export const profileLabels: Record<UserPublic['access_profile'], string> = {
  read_only: 'Somente leitura',
  tablet_checkin: 'Tablet (check-in)',
  operational: 'Operacional (recepção)',
  operations_admin: 'Administrador operacional',
};