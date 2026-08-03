# Regras de Negócio — API Voll.med

Este documento centraliza todas as regras de negócio implementadas na API, servindo como referência para desenvolvimento, revisão e testes.

---

## Consultas

### Agendamento (`AgendaDeConsultas.agendar`)

| # | Regra | Erro |
|---|-------|------|
| 1 | Paciente deve existir e estar ativo | 400 — Paciente não existe ou está inativo |
| 2 | Médico informado deve existir e estar ativo | 400 — Médico não existe ou está inativo |
| 3 | Clínica funciona Seg–Sáb, das 07h às 19h | 400 — Horário fora do funcionamento |
| 4 | Antecedência mínima conforme prioridade: `ROTINA`=30min, `PRIORITARIO`=10min, `URGENCIA`=sem restrição | 400 — Antecedência mínima não respeitada |
| 5 | Paciente não pode ter duas consultas no mesmo dia | 400 — Paciente já possui consulta no dia |
| 6 | Médico informado deve ter disponibilidade no dia/horário | 400 — Médico sem disponibilidade cadastrada |
| 7 | Médico não pode ter duas consultas no mesmo horário | 400 — Médico ocupado no horário |
| 8 | Se médico não for informado, sistema escolhe aleatório com disponibilidade real | — |
| 9 | Se não houver médico disponível, agendamento é recusado | 400 — Nenhum médico disponível |
| 10 | Campo `prioridade` é opcional — omitido equivale a `ROTINA` | — |

### Retorno de Consulta

| # | Regra | Erro |
|---|-------|------|
| 1 | Informar `consultaOrigemId` no agendamento para criar um retorno | 400 — Consulta de origem não encontrada |
| 2 | Consulta de origem deve existir e estar ativa | 400 |
| 3 | Retorno deve ocorrer em até 30 dias após a consulta original | 400 |
| 4 | Cada consulta pode ter no máximo um retorno | 400 |
| 5 | Retorno não consome a cota diária do paciente (ignora regra de uma consulta por dia) | — |
| 6 | Campo `tipo` na resposta indica `NORMAL` ou `RETORNO`; `consultaOrigemId` indica o vínculo | — |

### Cancelamento (`AgendaDeConsultas.cancelar`)

| # | Regra | Erro |
|---|-------|------|
| 1 | Consulta deve existir | 400 — ID da consulta não existe |
| 2 | Cancelamento com mínimo 24h de antecedência | 400 — Antecedência mínima não respeitada |
| 3 | Campo `canceladoPor` opcional: `PACIENTE` ou `CLINICA` | — |

---

## Disponibilidade de Médicos

| # | Regra |
|---|-------|
| 1 | Médico deve estar ativo para ter disponibilidade cadastrada |
| 2 | Exclusão é lógica (campo `ativo = false`) |
| 3 | Ao agendar com médico explícito, o horário deve estar dentro de um intervalo ativo de disponibilidade |
| 4 | Ao buscar médico aleatório, apenas médicos com disponibilidade real no horário são considerados |

---

## Pacientes

| # | Regra | Erro |
|---|-------|------|
| 1 | `ROLE_FUNCIONARIO` cadastra, atualiza, lista, detalha e inativa pacientes | 403 |
| 2 | `ROLE_MEDICO` lista e detalha apenas pacientes vinculados às suas consultas ativas | 403 |
| 3 | `ROLE_AUDITOR` e `ROLE_GESTOR` têm leitura ampla para auditoria/gestão | — |
| 4 | `ROLE_ADMIN` não acessa dados de pacientes por padrão | 403 |

---

## Prontuários

| # | Regra | Erro |
|---|-------|------|
| 1 | Consulta referenciada deve existir e estar ativa | 404 / 400 |
| 2 | Cada consulta pode ter no máximo um prontuário | 409 — Prontuário já existe |
| 3 | Apenas o médico que realizou a consulta pode criar o prontuário | 403 |
| 4 | Apenas o médico que criou pode editar o prontuário | 403 |
| 5 | Edição permitida somente dentro de 24h após o registro | 422 — Janela de edição expirada |
| 6 | `ROLE_MEDICO` acessa apenas prontuários de suas próprias consultas | 403 |
| 7 | `ROLE_FUNCIONARIO` tem acesso operacional de leitura a prontuários quando necessário ao fluxo da clínica | — |
| 8 | `ROLE_ADMIN` não acessa conteúdo clínico por padrão; acesso administrativo não implica acesso assistencial | 403 |
| 9 | Leitura clínica ampla, quando necessária para auditoria/gestão, deve usar perfil específico (`ROLE_AUDITOR` ou `ROLE_GESTOR`) e ser auditada | — |
| 10 | Exclusão/inativação administrativa de prontuário deve ser restrita a perfil com responsabilidade formal (`ROLE_AUDITOR` ou `ROLE_GESTOR`), não ao admin técnico | — |

---

## Prescrições

| # | Regra | Erro |
|---|-------|------|
| 1 | Prontuário referenciado deve existir e estar ativo | 404 |
| 2 | Apenas o médico responsável pelo prontuário pode criar prescrições | 403 |
| 3 | `ROLE_MEDICO` acessa apenas prescrições de seus próprios prontuários | 403 |
| 4 | `ROLE_FUNCIONARIO` tem acesso operacional de leitura quando necessário; `ROLE_ADMIN` não acessa prescrições por padrão | — |
| 5 | Leitura ampla de prescrições deve usar `ROLE_AUDITOR` ou `ROLE_GESTOR`, com trilha de auditoria | — |
| 6 | Receita `SIMPLES` tem validade de 30 dias; `ESPECIAL` de 60 dias (calculado automaticamente) | — |
| 7 | Toda prescrição deve ter ao menos um item | 400 |

---

## Atestados

| # | Regra | Erro |
|---|-------|------|
| 1 | Prontuário referenciado deve existir e estar ativo | 404 |
| 2 | Apenas o médico responsável pelo prontuário pode emitir atestados | 403 |
| 3 | `ROLE_MEDICO` acessa apenas atestados vinculados aos seus prontuários | 403 |
| 4 | `ROLE_FUNCIONARIO` tem acesso operacional de leitura quando necessário; `ROLE_ADMIN` não acessa atestados por padrão | — |
| 5 | Leitura ampla de atestados deve usar `ROLE_AUDITOR` ou `ROLE_GESTOR`, com trilha de auditoria | — |
| 6 | `diasAfastamento` deve ser no mínimo 1 | 400 |
| 7 | `cid10` e `observacoes` são opcionais | — |
| 8 | `dataEmissao` é preenchida automaticamente com a data atual | — |
| 9 | Exclusão é lógica (campo `ativo = false`), restrita a perfil com responsabilidade formal (`ROLE_AUDITOR` ou `ROLE_GESTOR`) | — |

---

## Especialidades

| # | Regra | Erro |
|---|-------|------|
| 1 | Nome da especialidade deve ser único (case-insensitive) | 409 — Já existe uma especialidade com este nome |
| 2 | Inclusão, atualização e exclusão lógica (campo `ativo = false`) são restritas a `ROLE_FUNCIONARIO` | — |
| 3 | `GET /especialidades` e `GET /especialidades/{id}` são acessíveis a `ROLE_FUNCIONARIO`, `ROLE_MEDICO`, `ROLE_AUDITOR` e `ROLE_GESTOR` | — |

---

## Usuários e Autenticação

| # | Regra |
|---|-------|
| 1 | Apenas `ROLE_ADMIN` pode criar novos usuários |
| 2 | `ROLE_ADMIN` é um perfil técnico-administrativo: gerencia usuários operacionais, mas não acessa dados clínicos nem cadastros operacionais por padrão |
| 3 | Não é possível criar outro `ROLE_ADMIN` via endpoint de cadastro |
| 4 | `ROLE_AUDITOR` ou `ROLE_GESTOR` deve ser usado para leitura ampla de dados clínicos, auditoria LGPD e relatórios sensíveis |
| 5 | Senhas armazenadas com BCrypt |
| 6 | Token JWT expira conforme `TOKEN_EXPIRACAO_HORAS` (padrão: 2h) |
| 7 | Rate limiting: máx. 10 requisições por IP em 15 min em `/auth/*` |
| 8 | Admin inicial criado automaticamente se não existir e `ADMIN_PASSWORD` estiver configurado |
| 9 | `ROLE_ADMIN` pode criar `ROLE_FUNCIONARIO`, `ROLE_MEDICO`, `ROLE_AUDITOR` e `ROLE_GESTOR`; não pode criar outro `ROLE_ADMIN` pela API |

---

## Perfis e Permissões por Endpoint

Modelo profissional recomendado:

- `ROLE_ADMIN`: administração técnica do sistema e usuários operacionais. Não acessa conteúdo clínico nem cadastros operacionais por padrão.
- `ROLE_FUNCIONARIO`: operação administrativa da clínica, cadastros, agenda, convênios e leitura operacional necessária ao atendimento.
- `ROLE_MEDICO`: atendimento clínico, agenda própria, prontuários próprios, prescrições, atestados e IA clínica.
- `ROLE_AUDITOR` ou `ROLE_GESTOR`: leitura ampla de dados clínicos, auditoria LGPD e relatórios sensíveis, sempre com registro de acesso.

| Endpoint | ADMIN | FUNCIONARIO | MEDICO | AUDITOR/GESTOR |
|----------|:-----:|:-----------:|:------:|:--------------:|
| `POST /auth/cadastro` | ✅ | — | — | — |
| `POST /especialidades` | — | ✅ | — | — |
| `PUT /especialidades/{id}` | — | ✅ | — | — |
| `DELETE /especialidades/{id}` | — | ✅ | — | — |
| `GET /especialidades` | — | ✅ | ✅ | ✅ |
| `POST /convenios` | — | ✅ | — | — |
| `PUT /convenios/{id}` | — | ✅ | — | — |
| `DELETE /convenios/{id}` | — | ✅ | — | — |
| `GET /convenios` | — | ✅ | ✅ | ✅ |
| `POST /medicos/{id}/convenios` | — | ✅ | — | — |
| `GET /medicos/{id}/convenios` | — | ✅ | ✅ | ✅ |
| `DELETE /medicos/{id}/convenios/{convenioId}` | — | ✅ | — | — |
| `POST /pacientes/{id}/convenios` | — | ✅ | — | — |
| `GET /pacientes/{id}/convenios` | — | ✅ | — | ✅ |
| `DELETE /pacientes/{id}/convenios/{vinculoId}` | — | ✅ | — | — |
| `POST /medicos` | — | ✅ | — | — |
| `PUT /medicos` | — | ✅ | — | — |
| `DELETE /medicos/{id}` | — | ✅ | — | — |
| `GET /medicos` | — | ✅ | ✅ | ✅ |
| `GET /medicos/{id}` | — | ✅ | ✅ | ✅ |
| `POST /pacientes` | — | ✅ | — | — |
| `PUT /pacientes` | — | ✅ | — | — |
| `DELETE /pacientes/{id}` | — | ✅ | — | — |
| `GET /pacientes` | — | ✅ | ✅ (apenas vinculados) | ✅ |
| `POST /consultas` | — | ✅ | — | — |
| `DELETE /consultas` | — | ✅ | — | — |
| `GET /consultas` | — | ✅ | ✅ (apenas as suas) | ✅ |
| `POST /medicos/{id}/disponibilidade` | — | ✅ | — | — |
| `GET /medicos/{id}/disponibilidade` | — | ✅ | ✅ | ✅ |
| `DELETE /medicos/{id}/disponibilidade/{dispId}` | — | ✅ | — | — |
| `POST /prontuarios` | — | — | ✅ (da sua consulta) | — |
| `PUT /prontuarios` | — | — | ✅ (seu, em 24h) | — |
| `GET /prontuarios` | — | ✅ (leitura operacional) | ✅ (apenas os seus) | ✅ |
| `DELETE /prontuarios/{id}` | — | — | — | ✅ |
| `POST /prescricoes` | — | — | ✅ (do seu prontuário) | — |
| `GET /prescricoes/{id}` | — | ✅ (leitura operacional) | ✅ (apenas os seus) | ✅ |
| `GET /prescricoes/prontuario/{id}` | — | ✅ (leitura operacional) | ✅ (apenas os seus) | ✅ |
| `POST /atestados` | — | — | ✅ (do seu prontuário) | — |
| `GET /atestados/{id}` | — | ✅ (leitura operacional) | ✅ (apenas os seus) | ✅ |
| `GET /atestados/paciente/{id}` | — | ✅ (leitura operacional) | ✅ (apenas os seus) | ✅ |
| `GET /auditoria/**` | — | — | — | ✅ |
