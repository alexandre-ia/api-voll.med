# Planejamento de Evolução — API Voll.med

Este documento registra as funcionalidades planejadas para tornar o sistema utilizável em um consultório médico real, organizadas por prioridade e impacto.

---

## Status atual

| Módulo | Situação |
|--------|----------|
| Médicos | CRUD completo com exclusão lógica |
| Pacientes | CRUD completo com exclusão lógica |
| Consultas | Agendamento e cancelamento com triagem, retorno e canceladoPor |
| Usuários | Cadastro com perfis (ADMIN, FUNCIONARIO, MEDICO) |
| Autenticação | JWT + rate limiting |
| Documentação | Swagger habilitado em dev |
| **Prontuário Eletrônico** | **Implementado (V12)** |
| **Agenda de Disponibilidade** | **Implementado (V13)** |
| **Prescrição / Receita Médica** | **Implementado (V14)** |
| **Triagem e Retorno de Consulta** | **Implementado (V15, V16)** |
| **Atestado Médico** | **Implementado (V17)** |
| **Convênios / Planos de Saúde** | **Implementado (V18)** |
| **Auditoria LGPD (Prontuário, Prescrição, Atestado)** | **Implementado (V19, ampliado em V25) via AOP** |
| **Auditoria de Entidades (JPA)** | **Implementado (V20)** |
| **Especialidade como entidade** | **Implementado (V21)** |
| **Integração com IA (Claude API)** | **Implementado** |
| Filtro consultas por médico logado | Implementado |

---

## Prioridade 1 — Crítico (sistema não é funcional sem isso)

### ✅ 1.1 Prontuário Eletrônico — IMPLEMENTADO

O mais importante. Atualmente uma consulta é agendada e cancelada, mas nenhum registro clínico é feito. O médico precisa registrar o que aconteceu após o atendimento.

**Dados do prontuário:**
- Consulta vinculada (1:1)
- Anamnese (queixa principal, histórico)
- Diagnóstico (texto livre + CID-10)
- Observações e conduta
- Data/hora do registro
- Médico responsável

**Regras:**
- Somente o médico que realizou a consulta pode criar/editar o prontuário
- Após 24h do registro, o prontuário não pode ser editado (integridade clínica)
- `ROLE_MEDICO` acessa apenas prontuários de seus próprios pacientes
- `ROLE_FUNCIONARIO` tem acesso operacional de leitura quando necessário ao fluxo da clínica
- `ROLE_ADMIN` não acessa conteúdo clínico por padrão; leitura ampla deve ficar em `ROLE_AUDITOR` ou `ROLE_GESTOR`

**Endpoints sugeridos:**
```
POST   /prontuarios              → criar prontuário (vinculado a uma consulta)
GET    /prontuarios/{id}         → detalhar
GET    /prontuarios/paciente/{id} → histórico clínico do paciente
PUT    /prontuarios/{id}         → editar (dentro da janela de 24h)
```

---

### ✅ 1.2 Agenda de Disponibilidade do Médico — IMPLEMENTADO

Hoje o sistema escolhe um médico "aleatório livre na data", mas não sabe quais dias e horários cada médico realmente atende. Sem isso, o agendamento é fictício.

**Dados da disponibilidade:**
- Médico vinculado
- Dia da semana (`SEGUNDA` a `SABADO`)
- Hora de início e hora de fim
- Ativo/inativo

**Regras:**
- Ao agendar, validar se o médico informado tem disponibilidade no dia/horário
- Ao buscar médico aleatório, filtrar apenas os disponíveis no horário solicitado

**Endpoints sugeridos:**
```
POST   /medicos/{id}/disponibilidade   → cadastrar horários
GET    /medicos/{id}/disponibilidade   → listar horários do médico
DELETE /medicos/{id}/disponibilidade/{disponibilidadeId} → remover horário
```

---

### ✅ 1.3 Prescrição / Receita Médica — IMPLEMENTADO

Vinculada ao prontuário. Sem prescrição, o sistema não tem valor clínico real.

**Dados da prescrição:**
- Prontuário vinculado
- Lista de itens: medicamento, dosagem, posologia, duração
- Tipo: `SIMPLES`, `ESPECIAL` (receita azul/amarela)
- Data de validade (calculada automaticamente: 30 dias para simples, 60 para especial)

**Endpoints sugeridos:**
```
POST   /prescricoes              → criar prescrição vinculada a um prontuário
GET    /prescricoes/{id}         → detalhar
GET    /prescricoes/prontuario/{id} → listar prescrições de um prontuário
```

---

## Prioridade 2 — Importante (diferencia o sistema)

### ✅ 2.1 Triagem com Prioridade — IMPLEMENTADO

Ao agendar uma consulta, classificar a urgência. Afeta a ordem de atendimento e pode flexibilizar a regra de antecedência mínima.

**Enum `PrioridadeConsulta`:**
- `ROTINA` → segue as regras normais (30 min de antecedência)
- `PRIORITARIO` → antecedência mínima reduzida (10 min)
- `URGENCIA` → sem restrição de antecedência

**Impacto em consultas:** adicionar o campo `prioridade` na entidade `Consulta` e ajustar a validação `validarAntecedenciaMinima()` em `AgendaDeConsultas`.

---

### ✅ 2.2 Retorno de Consulta — IMPLEMENTADO

Consultas de retorno vinculadas à consulta original, com regras próprias de negócio.

**Regras:**
- Retorno deve ocorrer em até 30 dias após a consulta original
- Retorno é gratuito (não consome a cota diária do paciente)
- Uma consulta pode ter no máximo um retorno

**Dados adicionais em `Consulta`:**
- `consulta_origem_id` (nullable, FK para a própria tabela)
- `tipo`: `NORMAL`, `RETORNO`

---

### ✅ 2.3 Atestado Médico — IMPLEMENTADO

Geração de atestados vinculados ao prontuário.

**Dados do atestado:**
- Prontuário vinculado
- Número de dias de afastamento
- CID-10 (opcional, a critério do médico)
- Data de emissão
- Observações

**Endpoints sugeridos:**
```
POST   /atestados                → emitir atestado
GET    /atestados/{id}           → detalhar
GET    /atestados/paciente/{id}  → histórico de atestados do paciente
```

---

### ✅ 2.4 Convênios / Planos de Saúde — IMPLEMENTADO

Muda completamente a lógica do sistema — sem isso, não há como saber como a consulta será cobrada.

**Estrutura:**
- Tabela `convenios`: nome, código ANS, tipo (`PARTICULAR`, `PLANO`)
- Tabela `paciente_convenios`: relação N:N entre paciente e convênio, com número da carteirinha e validade
- `Consulta` passa a ter `convenio_id` (qual plano foi usado)

**Regras:**
- Validar se o médico atende o convênio do paciente
- Consulta particular não exige convênio

---

### ✅ 2.5 Auditoria de Acesso ao Prontuário (LGPD) — IMPLEMENTADO

Obrigatório para conformidade com a LGPD em sistemas de saúde. Registrar quem acessou qual prontuário e quando.

**Tabela `auditoria_prontuario`:**
- `prontuario_id`
- `usuario_id` (quem acessou)
- `acao`: `VISUALIZOU`, `CRIOU`, `EDITOU`
- `data_hora`
- `ip_origem`

**Implementação:** interceptar via AOP (`@Aspect`) nos métodos do `ProntuarioService`.

---

## Prioridade 3 — Melhorias no que já existe

### ✅ 3.1 Filtro real de consultas por médico logado — IMPLEMENTADO

O vínculo `Medico.usuario` existe (tabela `medicos.usuario_id`) e a listagem de consultas já filtra por ele. `ROLE_MEDICO` vê apenas suas próprias consultas.

**Mudança em `ConsultaController`:**
```java
// Injetar o médico logado via SecurityContext e filtrar no repository
medicoRepository.findByUsuario(usuarioLogado)
```

### ✅ 3.2 Registrar quem cancelou a consulta — IMPLEMENTADO

Atualmente o cancelamento registra apenas o motivo. Falta saber se foi o paciente ou a clínica que cancelou.

**Adicionar em `Consulta`:**
- `cancelado_por`: enum `PACIENTE`, `CLINICA`
- `cancelado_em`: `LocalDateTime`

### ✅ 3.3 Auditoria de criação/alteração de entidades — IMPLEMENTADO

Adicionar rastreamento automático nas entidades principais.

**Via `@EntityListeners(AuditingEntityListener.class)` do Spring Data:**
```java
@CreatedDate
private LocalDateTime criadoEm;

@LastModifiedDate
private LocalDateTime atualizadoEm;

@CreatedBy
private String criadoPor;
```

Requer habilitar `@EnableJpaAuditing` na aplicação.

### ✅ 3.4 Especialidade como tabela separada — IMPLEMENTADO

`Especialidade` foi migrada de enum fixo para a entidade `EspecialidadeEntity` e tabela `especialidades` (V21). Novas especialidades podem ser adicionadas sem deploy via migration de `INSERT`.

---

## Ideias do time

### IA para Auxílio Médico

Integração com a Claude API (Anthropic) para adicionar inteligência clínica ao sistema. As três funcionalidades abaixo dependem do **Prontuário Eletrônico (1.1)** — implementar após ele estar pronto.

---

#### A) Assistente de Pré-Diagnóstico

O médico informa os sintomas relatados pelo paciente e a IA retorna suporte diagnóstico em tempo real.

**Entrada:** texto livre com sintomas descritos pelo paciente

**Retorno da IA:**
- Possíveis hipóteses diagnósticas
- Sugestões de exames complementares
- Sinais de alerta
- Classificação de risco

**Endpoint sugerido:**
```
POST /ia/pre-diagnostico
Body: { "consulta_id": 1, "sintomas": "febre há 3 dias, dor no corpo, tosse seca" }
```

**Dependências:** Prontuário Eletrônico (1.1)

---

#### B) Geração Automática de Laudo

O médico escreve anotações livres e a IA estrutura um laudo clínico profissional.

**Entrada:** anotações livres do médico (ex: "Paciente com febre há 3 dias, dor no corpo, tosse seca...")

**Retorno da IA — laudo estruturado com:**
- Introdução formal
- Anamnese organizada
- Impressão diagnóstica
- Plano terapêutico sugerido

**Endpoint sugerido:**
```
POST /ia/gerar-laudo
Body: { "prontuario_id": 1, "anotacoes": "..." }
```

**Dependências:** Prontuário Eletrônico (1.1)

---

#### C) Resumo Inteligente do Histórico do Paciente

Com múltiplas consultas registradas, a IA gera um resumo clínico consolidado do paciente.

**Retorno da IA:**
- Principais queixas ao longo do tempo
- Frequência de retorno
- Padrões recorrentes
- Alertas clínicos (ex: pressão elevada frequente)

**Endpoint sugerido:**
```
GET /ia/resumo-historico/{paciente_id}
```

**Dependências:** histórico de prontuários acumulado (mín. 3 consultas para ser útil)

---

## Gaps do Frontend

Backend completo. Frontend conectado à API real na maior parte dos módulos.

| Controller | API Module (`frontend/src/api/`) | Página/Rota | Status |
|---|---|---|---|
| `DisponibilidadeMedicoController` | `disponibilidade.ts` ✅ | `/availability` ✅ | Implementado |
| `MedicoConvenioController` | `medicoConvenios.ts` ✅ | Integrado à área de médicos/convênios ✅ | Implementado |
| `ConvenioPacienteController` | `convenioPaciente.ts` ✅ | Integrado à área de pacientes/convênios ✅ | Implementado |
| `AuditoriaController` | `auditoria.ts` ✅ | `/audit` ✅ | Implementado para `ROLE_AUDITOR`/`ROLE_GESTOR` |
| `IaController` | ❌ | ❌ | Pendente |

### Próxima implementação sugerida

1. **IA clínica no frontend** — definir UX (painel dentro do prontuário ou página separada), criar `frontend/src/api/ia.ts` e implementar as três features: pré-diagnóstico, geração de laudo e resumo histórico.
2. **Validação do frontend** — instalar dependências e rodar `npm run check`/`npm run build` para confirmar o estado real do TypeScript.

---

## Resumo de migrations

| Migration | Descrição | Status |
|-----------|-----------|--------|
| `V1`–`V11` | Base do sistema (médicos, pacientes, consultas, usuários) | Aplicado |
| `V12` | Criar tabela `prontuarios` | Aplicado |
| `V13` | Criar tabela `disponibilidade_medico` | Aplicado |
| `V14` | Criar tabela `prescricoes` e `prescricao_itens` | Aplicado |
| `V15` | Adicionar `prioridade` e `tipo` em `consultas` | Aplicado |
| `V16` | Adicionar `consulta_origem_id` e `cancelado_por` em `consultas` | Aplicado |
| `V17` | Criar tabela `atestados` | Aplicado |
| `V18` | Criar tabelas `convenios` e `convenio_pacientes`, adicionar `convenio_id` em `consultas` | Aplicado |
| `V19` | Criar tabela `auditoria_prontuario` | Aplicado |
| `V20` | Adicionar colunas de auditoria (`criado_em`, `atualizado_em`) em todas as entidades | Aplicado |
| `V21` | Criar tabela `especialidades`, migrar FK em `medicos`, remover coluna enum | Aplicado |
| `V22` | Criar tabela `medico_convenios` (N:N médico ↔ convênio) | Aplicado |
| `V23` | Ampliar `pacientes.telefone` de `CHAR(11)` para `VARCHAR(20)` | Aplicado |
| `V24` | Adicionar unicidade em `medicos.usuario_id` | Aplicado |
| `V25` | Ampliar auditoria LGPD com tipo/id do recurso clínico | Aplicado |
