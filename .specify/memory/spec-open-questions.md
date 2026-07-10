# Spec open questions (deferred by spec-author-normalizer)

- Author detected: Product Owner (confidence: med)
- Contexto ya decidido (no volver a preguntar): `research.md` de la spec 001 fija el mecanismo de
  autenticación como JWT emitido por el backend tras login con usuario/contraseña, con el rol
  (técnico/dispatcher/supervisor) viajando como claim (Q-A, ADR-0001). FR-012 ya exige "acceso
  autenticado" pero no describe la pantalla ni el flujo de login — es ese vacío el que esta
  normalización busca cubrir.
- Q1: ¿Quién crea las cuentas de usuario (alta de técnico/dispatcher/supervisor)? ¿Existe un flujo
  de auto-registro o las cuentas las provisiona un administrador/supervisor fuera de esta feature?
- Q2: ¿Debe existir un flujo de recuperación/reseteo de contraseña ("olvidé mi contraseña")? Si sí,
  ¿por email, por un administrador, u otro canal? No hay ninguna mención en el texto original.
- Q3: ¿Existe bloqueo de cuenta tras N intentos fallidos de login? Si sí, ¿cuántos intentos y bajo
  qué mecanismo de desbloqueo? No especificado.
- Q4: ¿Debe existir una opción "recordarme" / duración de sesión configurable, o la duración de la
  sesión (expiración del JWT) es un detalle puramente técnico sin relevancia de producto? No se
  indicó ninguna preferencia.
- Q5: ¿Qué mensaje debe mostrarse ante credenciales inválidas? ¿Debe distinguir "usuario no existe"
  de "contraseña incorrecta", o debe usar un mensaje genérico por seguridad (para no revelar qué
  parte del dato es incorrecta)? No especificado en el texto original.
- Q6: ¿Hay requisito de cierre de sesión (logout) explícito visible al usuario, o basta con que el
  token expire? No se mencionó.
- Q7: ¿Aplica alguna política de complejidad de contraseña (longitud mínima, caracteres requeridos)
  más allá del uso de usuario/contraseña ya decidido en research.md? No especificado — no se
  inventa ninguna regla concreta.
- Q8: ¿Se requiere alguna medida de accesibilidad o de UI específica para la pantalla de login
  (idioma, dispositivo móvil de campo para el técnico, modo offline), dado que el técnico opera en
  campo? No se mencionó nada al respecto en el texto original.
