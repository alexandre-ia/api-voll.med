# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Subir stack fullstack (MySQL + backend + frontend) — rodar da raiz do projeto
docker compose --env-file backend/.env up --build

# Subir apenas o banco para desenvolvimento local
docker compose --env-file backend/.env up -d db

# Executar a aplicação — rodar de dentro de backend/
cd backend && ./mvnw spring-boot:run

# Build completo (usar este após mudanças em @Value ou configuração — não confiar apenas no devtools)
cd backend && ./mvnw clean package

# Rodar testes
cd backend && ./mvnw test

# Rodar um único teste
cd backend && ./mvnw test -Dtest=NomeDaClasseTest
```

## Variáveis de ambiente (.env)

A aplicação lê `.env` via `spring.config.import=optional:file:.env[.properties]`. Como os comandos do backend são executados dentro de `backend/`, o arquivo esperado é `backend/.env`. O padrão do projeto é: variável no `.env` → mapeada em `application.properties` → lida via `@Value`.

| Variável no .env | Propriedade Spring | Descrição |
|------------------|--------------------|-----------|
| `JWT_SECRET` | `api.security.token.secret` | Chave JWT (mín. 32 chars) — `openssl rand -base64 32` |
| `TOKEN_EXPIRACAO_HORAS` | `api.security.token.expiracao-horas` | Expiração do JWT (padrão: 2h) |
| `DB_PASSWORD` | `spring.datasource.password` | Senha do MySQL (padrão: `root`) |
| `ADMIN_LOGIN` | `admin.login` | Login do admin inicial (padrão: `admin@vollmed.com`) |
| `ADMIN_PASSWORD` | `admin.password` | Senha do admin inicial — **obrigatório para criar o admin** |
| `ANTHROPIC_API_KEY` | `anthropic.api.key` | Chave da Anthropic; app inicia sem ela, mas chamadas `/ia/*` falham em runtime |

> **Importante:** Nunca usar `@Value("${NOME_VARIAVEL_ENV}")` diretamente. Sempre mapear em `application.properties` primeiro e usar `@Value("${propriedade.spring}")`. Este é o padrão adotado no projeto.

## Arquitetura

### Camadas

- **`controller/`** — endpoints REST; delegam para services ou domain services
- **`domain/<entidade>/`** — entidade JPA, repository, DTOs e regras de negócio internas
- **`service/`** — serviços de aplicação (`MedicoService`, `PacienteService`, `ConsultaService`, `UsuarioService`)
- **`infra/security/`** — filtro JWT (`SecurityFillter`), rate limiting (`RateLimitFilter`), configuração Spring Security (`SecurityConfigurations`), criação do admin inicial (`AdminInitializer`)
- **`infra/exception/`** — handler global de erros (`TratadorDeErros`)
- **`exception/`** — exceções de domínio (`ValidacaoException` → 400, `ConflitoException` → 409)
- **`docs/PLANEJAMENTO.md`** — roadmap de funcionalidades planejadas

### Fluxo de autenticação

1. `POST /auth/login` → `AutenticacaoController` → Spring Security autentica → `TokenService` gera JWT
2. Cada requisição passa por `RateLimitFilter` (bloqueia abusos) → `SecurityFillter` (valida JWT, carrega `Usuario` no `SecurityContext`)
3. `RateLimitFilter` atua apenas em `/auth/*` — máx. 10 req/IP em 15 min → HTTP 429

### Registro de filtros customizados (Spring Security 6.5+)

`SecurityFillter` e `RateLimitFilter` são `@Component`, mas **não devem ser registrados automaticamente como Servlet filters** pelo Spring Boot — apenas a security chain deve gerenciá-los. Por isso, `SecurityConfigurations` desabilita o auto-registro:

```java
@Bean
public FilterRegistrationBean<SecurityFillter> securityFillterRegistration(SecurityFillter f) {
    var reg = new FilterRegistrationBean<>(f);
    reg.setEnabled(false);
    return reg;
}
```

**Nunca remover esses `FilterRegistrationBean`** — sem eles, o Spring Security 6.5+ lança `IllegalArgumentException: does not have a registered order`.

### Perfis de usuário

- `ROLE_ADMIN` — administração técnica e usuários via `POST /auth/cadastro`, `GET /auth/usuarios` e `GET /auth/medicos-disponiveis` (médicos ativos ainda sem usuário vinculado, para o formulário de cadastro); não acessa dados clínicos nem cadastros operacionais por padrão, inclusive `GET /medicos`
- `ROLE_FUNCIONARIO` — operação da clínica, cadastros, agenda, convênios e leitura operacional necessária
- `ROLE_MEDICO` — atendimento clínico; vê apenas dados assistenciais vinculados ao médico logado e acessa IA clínica
- `ROLE_AUDITOR` / `ROLE_GESTOR` — leitura ampla, auditoria LGPD e relatórios sensíveis, sempre com rastreabilidade

### Admin inicial (AdminInitializer)

Ao iniciar, `AdminInitializer` (implementa `ApplicationRunner`) verifica se existe algum `ROLE_ADMIN` no banco. Se não existir e `ADMIN_PASSWORD` estiver configurado, cria o admin automaticamente. O processo é idempotente.

Logs para acompanhar:
- `"AdminInitializer: verificando admin. Login configurado: X"` → método chamado, propriedade lida
- `"admin já existe no banco"` → já há um ROLE_ADMIN, nenhuma ação
- `"ADMIN_PASSWORD não configurado"` → variável de ambiente não lida
- `"Admin inicial criado com login: X"` → sucesso

### Banco de dados

- `ddl-auto=validate` — Hibernate valida o schema mas não o altera; toda mudança estrutural exige migration Flyway
- Migrations em `backend/src/main/resources/db/migration/` com prefixo `V{n}__descricao.sql`
- Última migration aplicada: `V25` — próxima será `V26`
- Exclusão lógica via campo `ativo` em médicos, pacientes, consultas, prontuários, atestados, convênios e disponibilidades

### Regras de negócio de consultas (AgendaDeConsultas)

- Clínica funciona Seg–Sáb, 07h–19h
- Agendamento com mínimo 30 min de antecedência; cancelamento com mínimo 24h
- Paciente não pode ter duas consultas no mesmo dia
- Médico pode ser omitido — sistema escolhe aleatoriamente um disponível na data usando agenda de disponibilidade real

## Frontend

Monorepo — frontend em `frontend/` no mesmo repositório.

### Stack

- React 19 + TypeScript + Vite 7
- TailwindCSS v4 (via `@tailwindcss/vite`, sem `tailwind.config.ts`)
- **shadcn/ui** — 60+ componentes sobre Radix UI (`components/ui/`)
- **wouter** — router leve (substitui react-router-dom)
- Axios (client HTTP com interceptor JWT)
- React Hook Form + Zod v4 (formulários e validação)
- framer-motion (animações), recharts (gráficos), sonner (toasts)
- Lucide React (ícones)

### Comandos

```bash
cd frontend

# Instalar dependências
npm install

# Dev server (http://localhost:5173)
npm run dev

# Build de produção
npm run build

# Type check
npm run check
```

### Autenticação

- `AuthContext` + `useAuth` — token JWT no `localStorage`, decodificação do payload (login, role)
- `PrivateRoute` (em `App.tsx`) — redireciona para `/login` via `<Redirect>` do wouter se não autenticado
- `api/axios.ts` — injeta `Authorization: Bearer <token>` em toda requisição; redireciona para `/login` automaticamente no 401

### Paleta de cores

Warm beige definida em `src/index.css` via variáveis CSS (sistema TailwindCSS v4):

| Token | Hex | Uso |
|-------|-----|-----|
| `--background` | `#F5F0EB` | Fundo geral |
| `--card` / `--sidebar` | `#EDE8E3` | Cards e sidebar |
| `--primary` | `#6B7F6A` | Sage green — botões, links ativos |
| `--destructive` | `#C4714F` | Burnt orange — erros, cancelamentos |
| `--foreground` | `#1C1917` | Texto principal |
| `--muted-foreground` | `#78716C` | Texto secundário |

Fonte: **Plus Jakarta Sans** (Google Fonts, carregada em `index.html`).

### Estrutura

```
frontend/src/
├── api/               # axios.ts (instância + interceptors), auth.ts, módulos por domínio
├── contexts/          # AuthContext.tsx, ThemeContext.tsx
├── hooks/             # useAuth.ts, useMobile.tsx
├── lib/               # utils.ts (cn, formatters, validators), rbac.ts
├── components/
│   ├── ui/            # shadcn/ui (60+ componentes Radix)
│   ├── DashboardLayout.tsx  # sidebar responsiva com logout e highlight ativo
│   ├── PageHeader.tsx
│   ├── Badge.tsx, EmptyState.tsx, SearchInput.tsx, ErrorBoundary.tsx
├── pages/
│   ├── Login.tsx      # tela de login (mantida do frontend anterior)
│   ├── Dashboard.tsx
│   ├── Doctors.tsx, Patients.tsx, Appointments.tsx
│   ├── MedicalRecords.tsx, Prescriptions.tsx, Certificates.tsx
│   ├── Specialties.tsx, Insurance.tsx
│   ├── Users.tsx, Availability.tsx, Audit.tsx, ClinicalAI.tsx
│   └── NotFound.tsx
├── types/             # auth.ts (Role, User, JwtPayload), api.ts (todos os DTOs de domínio)
└── App.tsx            # router wouter + AuthProvider + ThemeProvider
```

### Rotas

| Path | Página | Auth |
|------|--------|------|
| `/login` | Login | pública |
| `/` | Dashboard | privada |
| `/doctors` | Médicos | privada |
| `/patients` | Pacientes | privada |
| `/appointments` | Consultas | privada |
| `/medical-records` | Prontuários | privada |
| `/prescriptions` | Prescrições | privada |
| `/certificates` | Atestados | privada |
| `/specialties` | Especialidades | privada |
| `/insurance` | Convênios | privada |
| `/users` | Usuários | `AdminRoute` (frontend) + backend restringem a `ROLE_ADMIN` |
| `/availability` | Disponibilidade médica | privada, não ADMIN |
| `/audit` | Auditoria LGPD | `ROLE_AUDITOR`/`ROLE_GESTOR` |
| `/clinical-ai` | IA Clínica | `ROLE_MEDICO` |

### Estado atual das páginas

Todas as páginas estão conectadas à API real. `mockData.ts` removido. Cada domínio tem seu módulo em `api/` e os DTOs correspondentes em `types/api.ts`. RBAC aplicado nos botões de ação (criar/editar/excluir restritos por role).

### CORS

Backend libera `localhost:3000`, `localhost:5173`, `localhost:5174` e domínios Vercel configurados em `SecurityConfigurations`. Para produção própria, atualizar a lista/padrão de CORS ali.

## Planejamento de evolução

Backend completo até V25. Frontend conectado à API real, incluindo IA clínica, emissão de atestados para `ROLE_MEDICO` e dashboard operacional com métricas reais. Próximo passo possível: otimização de bundle.

### Fase 1 do plano de correções (concluída)

Corrigido o bloqueio de cadastro de usuário médico: `ROLE_ADMIN` recebia `403` de `GET /medicos` (endpoint operacional) e o frontend descartava o erro silenciosamente, deixando o seletor de médicos sempre vazio. Solução: endpoint dedicado `GET /auth/medicos-disponiveis` (só ADMIN, só médicos ativos sem usuário), `UsuarioService` com `@Transactional` e bloqueio pessimista (`findByIdComBloqueio`) no vínculo médico↔usuário, e estados explícitos de carregando/vazio/erro/retry em `Users.tsx`. Ver `docs/DECISOES_TECNICAS.md` para detalhes e pendências.

Dependência frontend com vulnerabilidade conhecida: `npm audit` reporta 1 alta em `nanoid` (transitiva); correção não aplicada nesta fase por estar fora do escopo do bugfix.
