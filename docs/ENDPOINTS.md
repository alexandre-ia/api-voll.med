# Referência de Endpoints — API Voll.med

Todos os endpoints exigem autenticação via JWT (`Authorization: Bearer <token>`), exceto `/auth/login`.

Perfis recomendados para ambiente profissional:

- `ADMIN`: administração técnica e cadastro de usuários. Não acessa dados clínicos nem cadastros operacionais por padrão.
- `FUNCIONARIO`: operação da clínica, cadastros, agenda, convênios e leitura operacional.
- `MEDICO`: atendimento clínico e acesso aos próprios dados assistenciais.
- `AUDITOR`/`GESTOR`: leitura ampla, auditoria LGPD e relatórios sensíveis, sempre com rastreabilidade.

---

## Autenticação

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/auth/login` | Autenticar e obter JWT | Público |
| `POST` | `/auth/cadastro` | Criar novo usuário operacional (`FUNCIONARIO`, `MEDICO`, `AUDITOR` ou `GESTOR`); `ROLE_MEDICO` exige `medicoId` livre | ADMIN |
| `GET` | `/auth/usuarios` | Listar usuários cadastrados (paginado) | ADMIN |
| `GET` | `/auth/medicos-disponiveis` | Listar médicos ativos ainda sem usuário vinculado (paginado, projeção mínima `id`/`nome`/`crm`), para o formulário de cadastro de usuário médico | ADMIN |

---

## Especialidades

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/especialidades` | Cadastrar especialidade | FUNCIONARIO |
| `GET` | `/especialidades` | Listar especialidades ativas (paginado) | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `GET` | `/especialidades/{id}` | Detalhar especialidade | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `PUT` | `/especialidades/{id}` | Atualizar nome | FUNCIONARIO |
| `DELETE` | `/especialidades/{id}` | Inativar (soft delete) | FUNCIONARIO |

---

## Médicos

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/medicos` | Cadastrar médico | FUNCIONARIO |
| `GET` | `/medicos` | Listar médicos ativos (paginado) | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `GET` | `/medicos/{id}` | Detalhar médico | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `PUT` | `/medicos` | Atualizar médico (ID no body) | FUNCIONARIO |
| `DELETE` | `/medicos/{id}` | Inativar médico (exclusão lógica) | FUNCIONARIO |
| `POST` | `/medicos/{id}/disponibilidade` | Cadastrar horários de disponibilidade | FUNCIONARIO |
| `GET` | `/medicos/{id}/disponibilidade` | Listar horários de disponibilidade | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `DELETE` | `/medicos/{id}/disponibilidade/{dispId}` | Remover horário de disponibilidade | FUNCIONARIO |

---

## Pacientes

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/pacientes` | Cadastrar paciente | FUNCIONARIO |
| `GET` | `/pacientes` | Listar pacientes ativos (paginado) | FUNCIONARIO, AUDITOR/GESTOR; MEDICO apenas pacientes vinculados |
| `GET` | `/pacientes/{id}` | Detalhar paciente | FUNCIONARIO, AUDITOR/GESTOR; MEDICO apenas pacientes vinculados |
| `PUT` | `/pacientes` | Atualizar paciente (ID no body) | FUNCIONARIO |
| `DELETE` | `/pacientes/{id}` | Inativar paciente (exclusão lógica) | FUNCIONARIO |

---

## Consultas

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/consultas` | Agendar consulta | FUNCIONARIO |
| `GET` | `/consultas` | Listar consultas (paginado) | FUNCIONARIO, AUDITOR/GESTOR, MEDICO* |
| `DELETE` | `/consultas` | Cancelar consulta | FUNCIONARIO |

> *MEDICO vê apenas suas próprias consultas.

### Campos do agendamento (`POST /consultas`)
```json
{
  "idPaciente": 1,
  "idMedico": 2,              // opcional — sistema escolhe aleatório com disponibilidade real se omitido

  "data": "2025-01-15T10:00",
  "prioridade": "ROTINA",     // ROTINA (30 min) | PRIORITARIO (10 min) | URGENCIA (sem restrição). Padrão: ROTINA
  "consultaOrigemId": null    // ID da consulta original, para agendar retorno
}
```

### Campos do cancelamento (`DELETE /consultas`)
```json
{
  "idConsulta": 1,
  "motivo": "PACIENTE_DESISTIU",
  "canceladoPor": "PACIENTE"  // PACIENTE | CLINICA (opcional)
}
```

---

## Prontuários

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/prontuarios` | Criar prontuário vinculado a uma consulta | MEDICO (da consulta) |
| `GET` | `/prontuarios/{id}` | Detalhar prontuário | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |
| `GET` | `/prontuarios/paciente/{id}` | Histórico clínico do paciente | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |
| `GET` | `/prontuarios` | Listar prontuários ativos (paginado) | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |
| `PUT` | `/prontuarios` | Editar prontuário (ID no body, janela de 24h) | MEDICO (criador, dentro de 24h) |
| `DELETE` | `/prontuarios/{id}` | Inativar prontuário | AUDITOR/GESTOR |

> *MEDICO vê apenas prontuários de suas próprias consultas.

---

## Prescrições

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/prescricoes` | Criar prescrição vinculada a um prontuário | MEDICO (do prontuário) |
| `GET` | `/prescricoes/{id}` | Detalhar prescrição | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |
| `GET` | `/prescricoes/prontuario/{id}` | Listar prescrições de um prontuário | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |

> *MEDICO vê apenas prescrições de seus próprios prontuários.

### Campos da prescrição (`POST /prescricoes`)
```json
{
  "prontuarioId": 1,
  "tipo": "SIMPLES",         // SIMPLES (validade 30 dias) | ESPECIAL (60 dias)
  "itens": [
    {
      "medicamento": "Dipirona 500mg",
      "dosagem": "1 comprimido",
      "posologia": "A cada 8 horas",
      "duracao": "5 dias"
    }
  ]
}
```

---

## Atestados

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/atestados` | Emitir atestado vinculado a um prontuário | MEDICO (do prontuário) |
| `GET` | `/atestados/{id}` | Detalhar atestado | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |
| `GET` | `/atestados/paciente/{id}` | Histórico de atestados do paciente | FUNCIONARIO (leitura operacional), AUDITOR/GESTOR, MEDICO* |

> *MEDICO vê apenas atestados vinculados aos seus prontuários.

### Campos do atestado (`POST /atestados`)
```json
{
  "prontuarioId": 1,
  "diasAfastamento": 3,
  "cid10": "J11.1",         // opcional
  "observacoes": "Repouso recomendado." // opcional
}
```

---

## Convênios

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `POST` | `/convenios` | Cadastrar convênio | FUNCIONARIO |
| `GET` | `/convenios` | Listar convênios ativos (paginado) | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `GET` | `/convenios/{id}` | Detalhar convênio | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `PUT` | `/convenios/{id}` | Atualizar convênio | FUNCIONARIO |
| `DELETE` | `/convenios/{id}` | Inativar convênio | FUNCIONARIO |
| `POST` | `/medicos/{id}/convenios` | Vincular convênio aceito pelo médico | FUNCIONARIO |
| `GET` | `/medicos/{id}/convenios` | Listar convênios aceitos pelo médico | FUNCIONARIO, MEDICO, AUDITOR/GESTOR |
| `DELETE` | `/medicos/{id}/convenios/{convenioId}` | Desvincular convênio do médico | FUNCIONARIO |
| `POST` | `/pacientes/{id}/convenios` | Associar convênio ao paciente | FUNCIONARIO |
| `GET` | `/pacientes/{id}/convenios` | Listar convênios do paciente | FUNCIONARIO, AUDITOR/GESTOR |
| `DELETE` | `/pacientes/{id}/convenios/{vinculoId}` | Remover convênio do paciente | FUNCIONARIO |

---

## IA Clínica

> Todos os endpoints de IA exigem `ROLE_MEDICO`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/ia/pre-diagnostico` | Hipóteses diagnósticas a partir de sintomas — `claude-opus-4-7` |
| `POST` | `/ia/gerar-laudo` | Laudo estruturado a partir de anotações livres — `claude-sonnet-4-6` |
| `GET` | `/ia/resumo-historico/{pacienteId}` | Resumo clínico consolidado do paciente — `claude-sonnet-4-6` |

### Campos do pré-diagnóstico (`POST /ia/pre-diagnostico`)
```json
{
  "consultaId": 1,
  "sintomas": "febre há 3 dias, dor no corpo, tosse seca"
}
```

### Campos do laudo (`POST /ia/gerar-laudo`)
```json
{
  "prontuarioId": 1,
  "anotacoes": "Paciente com queixa de cefaleia intensa há 2 dias, sem melhora com analgésicos comuns..."
}
```

### Resposta de todos os endpoints de IA
```json
{
  "resposta": "texto gerado pela IA..."
}
```

---

## Auditoria e Gestão

> Endpoints de auditoria e relatórios sensíveis são separados do `ROLE_ADMIN` técnico.

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| `GET` | `/auditoria/prontuarios/{prontuarioId}` | Consultar trilha de acesso de um prontuário | AUDITOR/GESTOR |
| `GET` | `/auditoria/{recursoTipo}/{recursoId}` | Consultar trilha por recurso clínico (`PRONTUARIO`, `PRESCRICAO`, `ATESTADO`) | AUDITOR/GESTOR |

`ROLE_ADMIN` pode cadastrar usuários operacionais, mas não deve consultar conteúdo clínico, trilhas clínicas ou cadastros operacionais por padrão.

---

## Notas gerais

- Todos os endpoints paginados aceitam `?page=0&size=10&sort=campo,asc`
- Respostas de erro seguem o padrão `{ "campo": "mensagem" }` (validação) ou `{ "mensagem": "..." }` (negócio)
- Rate limiting ativo em `/auth/*`: máx. 10 req/IP em 15 min → HTTP 429
- Documentação interativa disponível em `/swagger-ui.html` (perfil dev)
