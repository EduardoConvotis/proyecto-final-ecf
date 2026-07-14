// DEMO de CI: comprobar que el gate bloquea cambios que NO compilan.
// Error de tipos intencional (TS2322): se asigna un string a un number.
// Borrar este archivo tras la demostración del pipeline.
export const ciDemoBroken: number = 'esto no es un número';
