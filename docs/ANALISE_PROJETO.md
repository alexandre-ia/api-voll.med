# Análise do Projeto Voll.med

Este documento consolida o estado atual do repositório e aponta divergências já corrigidas na documentação principal.

## Resumo

O Voll.med está estruturado como monorepo fullstack com backend Spring Boot, frontend React, Docker Compose para stack local, migrations Flyway e documentação técnica em `docs/` e `frontend/docs/`.

Estado atual documentado:

- Backend completo até a migration `V25` (`V26` será a próxima).
- Suite backend com **157 testes** passando em `docs/TESTES.md`.
- Frontend React 19 conectado à API real, incluindo dashboard operacional, auditoria LGPD e IA clínica.
- Integração com Anthropic API disponível no backend e consumida pela rota frontend `/clinical-ai`.
- Docker Compose fullstack usa `backend/.env` via `--env-file backend/.env`.

## Estrutura Real do Projeto

```text
.
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

O backend real está em `backend/` e o frontend real está em `frontend/`.

## Backend

Funcionalidades implementadas:

- Autenticação JWT em `/auth/login`.
- Cadastro de usuários em `/auth/cadastro`.
- Listagem de usuários em `/auth/usuarios`.
- RBAC com `ROLE_ADMIN`, `ROLE_FUNCIONARIO`, `ROLE_MEDICO`, `ROLE_AUDITOR` e `ROLE_GESTOR`.
- Vínculo obrigatório de usuário médico com `medicoId` livre ao criar `ROLE_MEDICO`, com descoberta via `GET /auth/medicos-disponiveis` (`ROLE_ADMIN`) e bloqueio pessimista contra vínculo concorrente.
- CRUD de médicos e pacientes com exclusão lógica.
- Agendamento e cancelamento de consultas.
- Triagem por prioridade da consulta.
- Retorno de consulta.
- Registro de quem cancelou a consulta.
- Prontuário eletrônico.
- Prescrições.
- Atestados.
- Convênios.
- Convênios associados ao paciente.
- Convênios aceitos pelo médico.
- Disponibilidade de médicos.
- Auditoria LGPD de prontuários, prescrições e atestados.
- Auditoria JPA em entidades.
- Especialidades como entidade/tabela.
- IA clínica via `/ia/*` restrita a `ROLE_MEDICO`.
- Swagger habilitado em desenvolvimento.
- Flyway com migrations de `V1` a `V25`.

## Frontend

O frontend já cobre os principais módulos operacionais e está conectado à API real.

Páginas e rotas atuais:

- `/login` — login.
- `/` — dashboard.
- `/users` — usuários, restrita a `ROLE_ADMIN` (`AdminRoute`).
- `/doctors` — médicos.
- `/patients` — pacientes.
- `/appointments` — consultas.
- `/medical-records` — prontuários.
- `/prescriptions` — prescrições.
- `/certificates` — atestados.
- `/specialties` — especialidades.
- `/insurance` — convênios.
- `/availability` — disponibilidade médica.
- `/audit` — auditoria LGPD para `ROLE_AUDITOR`/`ROLE_GESTOR`.
- `/clinical-ai` — IA clínica para `ROLE_MEDICO`.

Arquivos relevantes:

- `frontend/src/App.tsx`
- `frontend/src/pages/ClinicalAI.tsx`
- `frontend/src/api/ia.ts`
- `frontend/src/pages/Availability.tsx`
- `frontend/src/pages/Audit.tsx`
- `frontend/src/pages/Users.tsx`
- `frontend/src/api/disponibilidade.ts`
- `frontend/src/api/auditoria.ts`
- `frontend/src/api/medicoConvenios.ts`
- `frontend/src/api/convenioPaciente.ts`

## Documentação Atualizada

Arquivos alinhados com o estado atual:

- `README.md`: frontend descrito como conectado à API real, IA clínica backend/frontend e status até `V25`.
- `AGENTS.md`: login corrigido para `/auth/login` e orientação de `JWT_SECRET` ajustada.
- `CLAUDE.md`: perfis, rotas frontend, CORS, `ANTHROPIC_API_KEY` e exclusão lógica atualizados.
- `docs/ENDPOINTS.md`: `POST /auth/cadastro` documenta `medicoId` obrigatório para `ROLE_MEDICO`.
- `frontend/docs/API_CONTRATOS.md`: contrato de cadastro de usuário médico atualizado com `medicoId` e erros esperados.
- `docs/REGRAS_DE_NEGOCIO.md`: regras de vínculo médico/usuário e permissões de IA clínica adicionadas.
- `docs/TESTES.md`: troubleshooting de MySQL em Docker atualizado para erro `HY000/1130` e volume persistido incompatível.
- `docs/PLANEJAMENTO.md`: seção de IA atualizada de ideia planejada para funcionalidade implementada.

## Decisões de Acesso

`ROLE_ADMIN` é um perfil técnico-administrativo. Ele gerencia usuários, mas não acessa cadastros operacionais nem conteúdo clínico por padrão.

Leitura operacional fica com `ROLE_FUNCIONARIO`. Leitura clínica ampla e auditoria ficam com `ROLE_AUDITOR`/`ROLE_GESTOR`. Atendimento clínico e IA ficam com `ROLE_MEDICO`, respeitando filtros por vínculo do médico logado.

## Testes

Comando principal:

```bash
cd backend
./mvnw test
```

Suite validada: **157 testes**, 0 falhas.

Validação frontend documentada em `frontend/docs/ARCHITECTURE.md`:

```bash
cd frontend
npm ci
npm test
npm run check
npm run build
```

## Docker e Ambiente

Padrão atual:

```bash
docker compose --env-file backend/.env up --build
```

O arquivo `backend/.env` é a fonte para backend local e Docker Compose. O backend em container usa `DB_HOST=db` e `DB_PORT=3306`; o host acessa MySQL por `localhost:${DB_PORT:-3307}`.

Se o backend falhar com:

```text
Host '<ip>' is not allowed to connect to this MySQL server
SQL State: HY000
Error Code: 1130
```

e o próprio container MySQL também rejeitar a senha atual, o volume local provavelmente foi criado com credenciais antigas. Em ambiente descartável, recriar o volume resolve:

```bash
docker compose --env-file backend/.env down -v
docker compose --env-file backend/.env up --build
```

Não usar `down -v` se houver dados locais a preservar.

## Próximos Passos Recomendados

1. Rodar `./mvnw test` em `backend/` após alterações de backend.
2. Rodar `npm run check` e `npm run build` em `frontend/` após alterações de frontend.
3. Adicionar E2E smoke tests para login e navegação principal.
4. Avaliar code splitting para reduzir aviso de chunk grande do Vite.
5. Resolver os itens em "Pendências conhecidas" de `docs/DECISOES_TECNICAS.md` (login≠e-mail do médico, paginação do seletor de médicos, teste de concorrência real, vulnerabilidade `nanoid`).

## Conclusão

O sistema está em estágio avançado: backend amplo, frontend conectado à API real, IA clínica implementada ponta a ponta e documentação principal alinhada ao estado atual. As pendências atuais são de validação contínua, E2E e otimização, não lacunas funcionais grandes como nas versões anteriores da documentação.
