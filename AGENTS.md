# AGENTS.md

## Run Commands

```bash
# Start fullstack stack (MySQL + backend + frontend)
docker compose --env-file backend/.env up --build

# Run backend locally, if using Compose only for MySQL
cd backend
./mvnw spring-boot:run

# Run tests
cd backend
./mvnw test
```

## Architecture

- **Framework**: Spring Boot 3.5.4, Java 17, Maven
- **Database**: MySQL 8.0 on port 3307 (via Docker host mapping; backend container uses `db:3306`)
- **Migrations**: Flyway in `backend/src/main/resources/db/migration/`
- **Auth**: JWT via `/login` (public); other endpoints require Bearer token
- **Soft deletes**: Entities use `ativo` field, not physical deletes
- **Pagination**: 10 records per page (default)
- **API Docs**: Swagger UI at `/swagger-ui.html`

## Entry Points

- `ApiApplication.java` - main class
- Controllers: `AutenticacaoController`, `MedicoController`, `PacientesController`, `ConsultaController`, `DisponibilidadeMedicoController`, `ProntuarioController`, `PrescricaoController`, `AtestadoController`, `ConvenioController`, `ConvenioPacienteController`, `AuditoriaController`, `EspecialidadeController`, `IaController`

## Migrations applied

V1–V25 applied (next: V26)

## Tests

140 tests passing. Run from `backend/`: `./mvnw test`

- Unit/context: `ApiApplicationTests` (1), `AgendaDeConsultasTest` (17), `ProntuarioServiceTest` (7), `EspecialidadeServiceTest` (8), `IaServiceTest` (6), `AuditoriaProntuarioAspectTest` (2)
- Controller (`@WebMvcTest`): `ConsultaControllerTest`, `MedicoControllerTest`, `PacientesControllerTest`, `ProntuarioControllerTest`, `PrescricaoControllerTest`, `AtestadoControllerTest`, `EspecialidadeControllerTest`, `AutenticacaoControllerTest`, `ConvenioControllerTest`, `ConvenioPacienteControllerTest`, `MedicoConvenioControllerTest`, `DisponibilidadeMedicoControllerTest`, `AuditoriaControllerTest` (4)
- See `docs/TESTES.md` for full strategy

## Gotchas

- `backend/.env` file must exist for backend configuration and Docker Compose command above (DB_PASSWORD=root)
- `backend/.env.example` contains development-only defaults; copy it to `backend/.env` and change secrets outside local dev
- Fullstack Docker Compose publishes frontend on `${FRONTEND_PORT:-3000}` and backend on `${BACKEND_PORT:-8080}`
- JWT_SECRET defaults to weak `12345678` - override in production
- MySQL container needs password: `DB_PASSWORD=root` in `.env`
- Test database uses H2 in-memory (configured in spring-boot-starter-test)
- `SecurityFillter` and `RateLimitFilter` have `FilterRegistrationBean` disabling auto-registration — never remove them (Spring Security 6.5+ requirement)
- `ANTHROPIC_API_KEY` required for `/ia/*` endpoints — app starts without it but calls fail at runtime
- IA endpoints are `ROLE_MEDICO` only — do not change to broader roles
