# Contratos de API — Frontend ↔ Backend

Base URL: `http://localhost:8080`  
Auth: `Authorization: Bearer <tokenJWT>` em todas as requisições (exceto `/auth/login`).

Perfis de acesso recomendados:

- `ROLE_ADMIN`: administração técnica e cadastro de usuários. Não acessa dados clínicos nem cadastros operacionais por padrão.
- `ROLE_FUNCIONARIO`: operação da clínica, agenda, cadastros e leitura operacional.
- `ROLE_MEDICO`: atendimento clínico e acesso aos próprios dados assistenciais.
- `ROLE_AUDITOR`/`ROLE_GESTOR`: leitura ampla, auditoria LGPD e relatórios sensíveis.

---

## Autenticação

### POST /auth/login
```ts
// Request
{ login: string, senha: string }

// Response 200
{ tokenJWT: string }

// Response 400 (credenciais inválidas)
// Spring Security retorna 403 — tratar como "credenciais inválidas"
```

### POST /auth/cadastro (ROLE_ADMIN)
```ts
// Request
{ login: string, senha: string, role: 'ROLE_FUNCIONARIO' | 'ROLE_MEDICO' | 'ROLE_AUDITOR' | 'ROLE_GESTOR' }

// Response 201
{ id: number, login: string, role: 'ROLE_FUNCIONARIO' | 'ROLE_MEDICO' | 'ROLE_AUDITOR' | 'ROLE_GESTOR' }

// Response 409 — login já existe
// Response 403 — tentativa de criar ROLE_ADMIN
```

### GET /auth/usuarios (ROLE_ADMIN)
```ts
// Response 200 — Page<UsuarioDetalhamento>
{ content: Array<{ id: number, login: string, role: string }>, totalElements: number, totalPages: number, number: number, size: number }
```

---

## Especialidades

### GET /especialidades (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Page<Especialidade>
{
  content: Array<{ id: number, nome: string }>,
  totalElements: number, totalPages: number, number: number, size: number
}
```

### POST /especialidades (ROLE_FUNCIONARIO)
```ts
// Request
{ nome: string }

// Response 201
{ id: number, nome: string, ativo: boolean }

// Response 409 — nome duplicado (case-insensitive)
```

### GET /especialidades/{id} (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200
{ id: number, nome: string, ativo: boolean }
```

### PUT /especialidades/{id} (ROLE_FUNCIONARIO)
```ts
// Request
{ nome: string }

// Response 200
{ id: number, nome: string, ativo: boolean }
```

### DELETE /especialidades/{id} (ROLE_FUNCIONARIO)
```ts
// Response 204
```

---

## Médicos

### POST /medicos (ROLE_FUNCIONARIO)
```ts
// Request
{
  nome: string,
  email: string,
  telefone: string,
  crm: string,
  especialidadeId: number,
  endereco: {
    logradouro: string, bairro: string, cep: string,
    cidade: string, uf: string,
    complemento?: string, numero?: string
  }
}

// Response 201
{
  id: number, nome: string, email: string, crm: string,
  telefone: string, especialidade: string, endereco: Endereco
}
```

### GET /medicos?page=0&size=10 (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Page<MedicoListagem>
{ content: Array<{ id, nome, email, crm, especialidade }>, ... }
```

### GET /medicos/{id} (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — MedicoCompleto
{ id, nome, email, crm, telefone, especialidade, endereco }
```

### PUT /medicos (ROLE_FUNCIONARIO)
```ts
// Request — apenas campos alteráveis
{ id: number, nome?: string, telefone?: string, endereco?: Partial<Endereco> }

// Response 200 — MedicoCompleto
```

### DELETE /medicos/{id} (ROLE_FUNCIONARIO)
```ts
// Response 204 — soft delete
```

---

## Disponibilidade do Médico

### POST /medicos/{id}/disponibilidade (ROLE_FUNCIONARIO)
```ts
// Request
{ diaSemana: 'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY', horaInicio: string, horaFim: string }

// Response 201
{ id, medicoId, diaSemana, horaInicio, horaFim, ativo }
```

### GET /medicos/{id}/disponibilidade (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Array<Disponibilidade>
```

### DELETE /medicos/{id}/disponibilidade/{dispId} (ROLE_FUNCIONARIO)
```ts
// Response 204
```

---

## Pacientes

### POST /pacientes (ROLE_FUNCIONARIO)
```ts
// Request
{ nome, email, telefone, cpf: string (11 dígitos), endereco: Endereco }

// Response 201
{ id, nome, email, telefone, cpf, endereco, ativo }
```

### GET /pacientes?page=0&size=10 (ROLE_FUNCIONARIO / ROLE_AUDITOR / ROLE_GESTOR; ROLE_MEDICO apenas vinculados)
```ts
// Response 200 — Page<PacienteListagem>
```

### GET /pacientes/{id} (ROLE_FUNCIONARIO / ROLE_AUDITOR / ROLE_GESTOR; ROLE_MEDICO apenas vinculados)
```ts
// Response 200 — PacienteCompleto
```

### PUT /pacientes (ROLE_FUNCIONARIO)
```ts
// Request
{ id: number, nome?: string, telefone?: string, endereco?: Partial<Endereco> }
```

### DELETE /pacientes/{id} (ROLE_FUNCIONARIO)
```ts
// Response 204
```

---

## Consultas

### POST /consultas (ROLE_FUNCIONARIO)
```ts
// Request
{
  idPaciente: number,
  idMedico?: number,           // opcional — sistema escolhe se omitido
  data: string,                // ISO 8601: "2025-12-10T10:00:00"
  prioridade: 'ROTINA' | 'PRIORITARIO' | 'URGENCIA',
  consultaOrigemId?: number,   // para retorno
  convenioId?: number
}

// Response 200
{ id, idMedico, idPaciente, data, prioridade, tipo, convenioId, motivoCancelamento }
```

### GET /consultas?page=0&size=10 (ROLE_FUNCIONARIO / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — Page<ConsultaListagem>
// ROLE_MEDICO vê apenas suas consultas
```

### DELETE /consultas (ROLE_FUNCIONARIO)
```ts
// Request
{ idConsulta: number, motivo: 'PACIENTE_DESISTIU'|'MEDICO_CANCELOU'|'OUTROS', canceladoPor?: 'PACIENTE'|'CLINICA' }

// Response 204
```

---

## Prontuários

### POST /prontuarios (ROLE_MEDICO)
```ts
// Request
{ consultaId: number, anamnese: string, diagnostico: string, cid10?: string, observacoes?: string }

// Response 201
{ id, consultaId, nomeMedico, nomePaciente, anamnese, diagnostico, cid10, observacoes, dataRegistro }
```

### GET /prontuarios (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — Page<ProntuarioListagem>
// ROLE_MEDICO vê apenas seus prontuários
```

### GET /prontuarios/{id} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — ProntuarioCompleto
```

### GET /prontuarios/paciente/{pacienteId} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — Page<ProntuarioListagem>
```

### PUT /prontuarios (ROLE_MEDICO)
```ts
// Request — janela de 24h após criação
{ id: number, anamnese?: string, diagnostico?: string, cid10?: string, observacoes?: string }

// Response 200
// Response 422 — fora da janela de 24h
```

### DELETE /prontuarios/{id} (ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 204
```

---

## Prescrições

### POST /prescricoes (ROLE_MEDICO)
```ts
// Request
{
  prontuarioId: number,
  tipo: 'SIMPLES' | 'ESPECIAL',
  itens: Array<{ medicamento: string, dosagem: string, posologia: string, duracao: string }>
}

// Response 201
{ id, prontuarioId, tipo, dataEmissao, dataValidade, itens }
```

### GET /prescricoes/{id} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — PrescricaoCompleta
```

### GET /prescricoes/prontuario/{prontuarioId} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — Page<PrescricaoListagem>
```

---

## Atestados

### POST /atestados (ROLE_MEDICO)
```ts
// Request
{ prontuarioId: number, diasAfastamento: number, cid10?: string, observacoes?: string }

// Response 201
{ id, prontuarioId, diasAfastamento, cid10, dataEmissao, observacoes }
```

### GET /atestados/{id} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200
```

### GET /atestados/paciente/{pacienteId} (ROLE_FUNCIONARIO operacional / ROLE_AUDITOR / ROLE_GESTOR / ROLE_MEDICO)
```ts
// Response 200 — Page<AtestadoListagem>
```

---

## Convênios

### POST /convenios (ROLE_FUNCIONARIO)
```ts
// Request
{ nome: string, codigoANS: string, tipo: 'PARTICULAR' | 'PLANO' }
```

### GET /convenios (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Page<Convenio>
```

### GET /medicos/{id}/convenios (ROLE_FUNCIONARIO / ROLE_MEDICO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Array<ConvenioMedico>
```

### POST /medicos/{id}/convenios (ROLE_FUNCIONARIO)
```ts
// Request
{ convenioId: number }
```

### GET /pacientes/{id}/convenios (ROLE_FUNCIONARIO / ROLE_AUDITOR / ROLE_GESTOR)
```ts
// Response 200 — Array<ConvenioPaciente>
```

### POST /pacientes/{id}/convenios (ROLE_FUNCIONARIO)
```ts
// Request
{ convenioId: number, numeroCarteirinha: string, validade: string }
```

---

## IA Clínica (ROLE_MEDICO)

### POST /ia/pre-diagnostico
```ts
// Request
{ consultaId: number, sintomas: string }

// Response 200
{ resposta: string }
```

### POST /ia/gerar-laudo
```ts
// Request
{ prontuarioId: number, anotacoes: string }

// Response 200
{ resposta: string }
```

### GET /ia/resumo-historico/{pacienteId}
```ts
// Response 200
{ resposta: string }
```

---

## Tratamento de Erros

| Status | Significado | Ação no frontend |
|--------|-------------|-----------------|
| 400 | Dados inválidos | Mostrar mensagem do campo (`{ campo: "mensagem" }`) |
| 401 | Sem autenticação | Redirecionar para /login |
| 403 | Sem permissão | Toast de erro "Sem permissão para esta ação" |
| 404 | Não encontrado | Mensagem inline |
| 409 | Conflito (duplicata) | Toast ou erro no form |
| 422 | Regra de negócio | Toast com mensagem da API |
| 429 | Rate limit (auth) | "Muitas tentativas. Aguarde 15 minutos." |
| 500 | Erro interno | Toast genérico "Erro no servidor" |
