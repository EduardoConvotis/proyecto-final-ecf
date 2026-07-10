import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/domain/credentials.js';

// Provisión de 3 usuarios de prueba (uno por rol) — fuera del flujo de la app.
// Contraseñas cumplen la política (≥8, mayúscula, número, especial).
const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: 'tecnico1', role: 'tecnico' as const, password: 'Tecnico1!' },
    { username: 'dispatcher1', role: 'dispatcher' as const, password: 'Dispatch1!' },
    { username: 'supervisor1', role: 'supervisor' as const, password: 'Supervis1!' },
  ];

  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, role: u.role },
      create: { username: u.username, passwordHash, role: u.role },
    });
  }

  // Orden de ejemplo para validación E2E: asignada al técnico1, lista para registrar ejecución.
  const tecnico = await prisma.user.findUnique({ where: { username: 'tecnico1' } });
  if (tecnico) {
    const existing = await prisma.workOrder.findFirst({ where: { customer: 'Cliente Demo' } });
    if (!existing) {
      await prisma.workOrder.create({
        data: {
          customer: 'Cliente Demo',
          address: 'Calle Falsa 123',
          service: 'Reparación de fuga',
          date: new Date(),
          state: 'EnEjecucion',
          assignedTechnicianId: tecnico.id,
        },
      });
    }
  }
  // eslint-disable-next-line no-console -- script de provisión, salida informativa intencional
  console.log('Seed completado: 3 usuarios de prueba + 1 orden de ejemplo');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console -- script de provisión
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
