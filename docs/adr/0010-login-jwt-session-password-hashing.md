# ADR-0010: Login (JWT), hashing de contraseñas en provisión y logout stateless

- **Estado**: Proposed <!-- Proposed | Accepted | Superseded by ADR-XXXX | Deprecated -->
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: I, II, III, V, VII, VIII
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (US6, FR-026…FR-029)
- **Supersede a**: —

## Contexto y problema

`research.md` (Q-A) ya fijó el **mecanismo** de autenticación (JWT emitido tras login
usuario/contraseña, rol como claim) y ADR-0001 ya fija que **los roles viajan en el token** y que
el backend es la única autoridad de autorización. Lo que faltaba — y ahora la spec lo formaliza en
US6/FR-026…FR-029 — es la **frontera concreta de login/logout**: cómo se valida la contraseña
contra lo provisto (hashing), cómo se emite y valida el JWT en el backend, y qué hace "logout" si
el JWT es stateless.

Decisiones de producto confirmadas que acotan esta ADR (no se reabren):
- Las cuentas se **provisionan fuera de esta feature** (se siembran 3 usuarios de prueba, uno por
  rol); no hay registro de usuarios en el alcance.
- **No hay** recuperación de contraseña ni bloqueo por intentos fallidos en el alcance (FR-027 solo
  exige mensaje genérico, sin lockout).
- La **expiración de sesión es un detalle técnico del JWT** (TTL de expiración del token), no un
  requisito de negocio adicional.
- La **política de contraseña** (≥8 caracteres, mayúscula + número + carácter especial) se aplica
  **en la provisión** (fuera de esta feature), no en un formulario de registro de este alcance.
- Mensaje de credenciales inválidas **genérico** (FR-027, EC-015): no distingue usuario de
  contraseña.
- **Logout explícito** (FR-029): el usuario debe poder cerrar sesión de forma visible.

Falta decidir: (a) cómo se almacena/verifica la contraseña provista (hashing), y (b) qué hace
`POST /auth/logout` dado que el JWT, una vez emitido, es válido hasta su expiración salvo que se
invalide activamente.

## Decisión

1. **Hashing de contraseñas**: las contraseñas se almacenan **solo como hash** (`bcrypt`, factor de
   coste por defecto de la librería) en la tabla de usuarios; el proceso de provisión (fuera de
   esta feature) es responsable de aplicar la política de complejidad y generar el hash. El login
   (`POST /auth/login`, FR-026) compara la contraseña recibida contra el hash — nunca se compara ni
   se loguea la contraseña en claro (Principio V).
2. **Emisión de JWT**: en credenciales válidas, el backend emite un JWT firmado (HS256, secreto de
   servidor) con claims mínimos: `sub` (id de usuario) y `role` (uno de los tres roles de
   ADR-0001). El TTL de expiración es un parámetro de configuración del backend — detalle técnico,
   no requisito de negocio (confirmado por producto); no se implementa refresh token en este
   alcance (YAGNI, Principio II) al no haber requisito que lo exija.
3. **Login inválido (FR-027, EC-015)**: usuario o contraseña incorrectos devuelven **la misma**
   respuesta 401 con mensaje genérico ("credenciales inválidas"), sin revelar cuál campo falló. El
   intento fallido se audita (actor si se conoce el usuario, resultado `denied`) — FR-012/FR-013 —
   pero **no hay bloqueo de cuenta** (confirmado fuera de alcance).
4. **Middleware de autenticación** (`backend/src/middleware/auth.ts`): valida el JWT en cada
   request protegida (firma + expiración), rellena `req.user = { id, role }`, y delega en la
   política RBAC+ownership de ADR-0001. Ausencia/invalidez de JWT → 401 (FR-028); no reabre el
   orden de comprobación ya fijado en ADR-0001 (auth → rol → ownership).
5. **Logout stateless (FR-029)**: no se implementa una lista de revocación/blacklist de tokens (no
   hay requisito de invalidación inmediata del lado servidor ni de sesiones concurrentes en la
   spec). `POST /auth/logout` es una operación del contrato que el frontend invoca para **descartar
   el token del cliente** (borrar de almacenamiento local) y redirigir a login; el backend registra
   el evento de logout a efectos de auditoría (FR-013) pero no mantiene estado de sesión. Si un
   requisito futuro exige revocación inmediata (p. ej. tras cambio de rol), se abrirá una ADR nueva
   que supersede este punto — no se diseña ahora sin ese requisito (Principio II).
6. **Frontend — pantalla de login** (`features/auth/`): formulario usuario/contraseña construido
   con Tailwind sobre los tokens del `theme` (Principio VIII, igual que el resto de `shared/`/
   `features/`); no introduce un sistema de estilos distinto. Un guard de ruta (`core/`) redirige a
   login si no hay token válido (defensa en profundidad; la autoridad real sigue siendo el
   middleware de backend, ADR-0001) — cumple FR-028.

## Justificación (apoyada en la constitución)

- **Principio II (Simplicidad/YAGNI)**: se descarta refresh tokens, blacklist de logout y lockout
  porque ningún requisito confirmado los exige; añadirlos ahora sería complejidad especulativa.
- **Principio V (Observabilidad)**: contraseñas y tokens nunca se loguean en claro; los intentos
  fallidos de login se auditan igual que el resto de decisiones de autorización (ADR-0001).
- **Principio VII (Contract-First)**: `POST /auth/login` y `POST /auth/logout` viven en
  `contracts/openapi.yaml` con sus `x-fr` (FR-011/012/026/027 y FR-029) como cualquier otra
  operación; no hay autenticación "fuera de banda" del contrato.
- **Principio VIII (Tailwind)**: la pantalla de login es una feature de UI más — mismos tokens,
  mismo enfoque de componentes reutilizables que el resto del frontend.
- **Principio III (Trazabilidad)**: cada elemento de esta decisión traza a FR-026…FR-029 y a las
  decisiones de producto confirmadas (provisión externa, sin recuperación/lockout, TTL técnico).

## Consecuencias

- **Positivas**: frontera de login/logout explícita y mínima; ninguna pieza sin requisito que la
  respalde; reutiliza el modelo de autorización ya decidido (ADR-0001) sin reabrirlo.
- **Negativas / coste**: un JWT robado sigue siendo válido hasta su expiración tras "logout" (no
  hay revocación) — aceptado explícitamente por ausencia de requisito de invalidación inmediata.
- **Riesgos y mitigaciones**: TTL demasiado largo aumentaría la ventana de riesgo de un token
  robado — mitigación: TTL corto por defecto en configuración (valor concreto a fijar en
  `/speckit-plan`, no es una decisión de arquitectura sino de configuración).

## Alternativas consideradas

- **Blacklist de tokens revocados en logout** — descartada: exige estado de sesión del lado
  servidor (Redis u otro store) sin que ningún requisito de la spec lo pida; complejidad
  especulativa (Principio II).
- **Refresh tokens + access tokens de vida corta** — descartada por ahora: añade un segundo
  endpoint y rotación de tokens sin requisito que lo exija; revisable si aparece un requisito de
  sesión de larga duración.
- **Argon2 en vez de bcrypt** para hashing — ambas son opciones razonables; se elige `bcrypt` por
  ser el estándar más extendido en el ecosistema Node/Express sin justificar un requisito adicional
  que exija Argon2 específicamente.

## Open questions

- **TTL concreto del JWT** (p. ej. 15 min, 1 h, 8 h): detalle de configuración, no de arquitectura;
  a fijar en `/speckit-plan` o en configuración de entorno.
