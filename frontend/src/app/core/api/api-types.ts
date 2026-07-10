// STOPGAP hecho a mano — REGENERAR con `npm run gen:api` (openapi-typescript) una vez
// instaladas las dependencias. Alineado con contracts/openapi.yaml (Principio VII).
export type Role = 'tecnico' | 'dispatcher' | 'supervisor';
export type OrderState = 'Asignada' | 'EnEjecucion' | 'Enviada' | 'Aprobada' | 'Rechazada';

export interface AuthToken {
  token: string;
  role: Role;
}

export interface WorkOrder {
  id: string;
  customer: string;
  address: string;
  service: string;
  date: string;
  assignedTechnicianId: string;
  state: OrderState;
}

export interface ApiError {
  code: string;
  message: string;
}
