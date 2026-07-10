// Visibilidad de órdenes (US4). FR-010: cada usuario ve solo las órdenes asignadas a sí mismo.
export interface OwnedOrder {
  assignedTechnicianId: string;
}

// Filtro Prisma para listar solo las órdenes propias.
export function ownVisibilityFilter(userId: string): { assignedTechnicianId: string } {
  return { assignedTechnicianId: userId };
}

// Comprobación de ownership para acceso directo a una orden (404 si no es propia).
export function isOwnOrder(order: OwnedOrder | null, userId: string): order is OwnedOrder {
  return order !== null && order.assignedTechnicianId === userId;
}
