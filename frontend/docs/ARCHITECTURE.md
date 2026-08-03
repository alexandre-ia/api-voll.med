# Arquitetura Frontend — Voll.med

Frontend SPA em React 19 + TypeScript + Vite 7. A comunicação com o backend Spring Boot é feita via Axios com interceptor JWT.

## Stack

- React 19
- TypeScript 5.6
- Vite 7
- TailwindCSS v4 via `@tailwindcss/vite`
- shadcn/ui sobre Radix UI
- wouter para roteamento client-side
- Axios para HTTP
- React Hook Form + Zod para formulários e validação
- Sonner para toasts
- Recharts para gráficos
- Lucide React para ícones

## Estrutura Real

```text
frontend/src/
├── api/               # Axios e módulos por domínio
├── components/        # Layout, componentes compartilhados e shadcn/ui
├── contexts/          # AuthContext, ThemeContext
├── hooks/             # useAuth, useMobile
├── lib/               # utils, RBAC e helpers
├── pages/             # Páginas de rota
├── types/             # Tipos de auth, API e auditoria
├── App.tsx            # Router wouter + providers
├── const.ts
├── index.css          # Tailwind v4 + tokens CSS
└── main.tsx
```

## Módulos de API

Arquivos atuais em `frontend/src/api/`:

- `axios.ts` — instância Axios com interceptors de JWT e tratamento de 401.
- `auth.ts` — login e usuários.
- `medicos.ts` — médicos.
- `pacientes.ts` — pacientes.
- `consultas.ts` — consultas.
- `prontuarios.ts` — prontuários.
- `prescricoes.ts` — prescrições.
- `atestados.ts` — atestados.
- `especialidades.ts` — especialidades.
- `convenios.ts` — convênios.
- `disponibilidade.ts` — disponibilidade de médicos.
- `medicoConvenios.ts` — convênios aceitos por médicos.
- `convenioPaciente.ts` — convênios vinculados a pacientes.
- `auditoria.ts` — auditoria LGPD.

Ainda não existe módulo `ia.ts`; a interface de IA clínica está pendente.

## Autenticação

- `AuthContext` mantém token JWT em `localStorage`.
- `useAuth` expõe usuário autenticado, role, login e logout.
- `api/axios.ts` injeta `Authorization: Bearer <token>` em cada requisição.
- Resposta 401 redireciona para `/login`.

## Rotas

Rotas atuais em `App.tsx`:

| Path | Página | Guarda |
|------|--------|--------|
| `/login` | `Login` | Pública |
| `/` | `Dashboard` | Privada, exceto ADMIN/AUDITOR/GESTOR redirecionados |
| `/users` | `Users` | Privada |
| `/doctors` | `Doctors` | Privada |
| `/patients` | `Patients` | Privada, não ADMIN |
| `/appointments` | `Appointments` | Privada, não ADMIN |
| `/medical-records` | `MedicalRecords` | Privada, não ADMIN |
| `/prescriptions` | `Prescriptions` | Privada, não ADMIN |
| `/certificates` | `Certificates` | Privada, não ADMIN |
| `/specialties` | `Specialties` | Privada, não ADMIN |
| `/insurance` | `Insurance` | Privada, não ADMIN |
| `/availability` | `Availability` | Privada, não ADMIN |
| `/audit` | `Audit` | Apenas `ROLE_AUDITOR`/`ROLE_GESTOR` |
| `/404` | `NotFound` | Pública |

A segurança real é aplicada pelo backend. As guardas do frontend servem para UX e navegação.

## RBAC no Frontend

- `ROLE_ADMIN` é direcionado para `/users`.
- `ROLE_AUDITOR` e `ROLE_GESTOR` são direcionados para `/audit`.
- `ROLE_MEDICO` não vê navegação para usuários, especialidades, convênios e auditoria.
- Demais regras finas ficam nos botões e nas respostas 403 do backend.

## Estado Atual das Páginas

Páginas conectadas à API real:

- Dashboard
- Doctors
- Patients
- Appointments
- MedicalRecords
- Prescriptions
- Certificates
- Specialties
- Insurance
- Users
- Availability
- Audit

Pendente:

- IA clínica no frontend (`/ia` ou integração no prontuário a definir).

## Tailwind v4

O projeto usa TailwindCSS v4 via plugin do Vite. Não há `tailwind.config.ts` como fonte principal de tokens; as variáveis de tema ficam em `src/index.css`.

## Convenções

- Componentes e páginas em PascalCase.
- Arquivos de API em camelCase.
- Imports absolutos via `@/`.
- Tipos compartilhados em `src/types/`.
- Evitar `any` em contratos de API.
