# 🏥 Voll.med Fullstack

Sistema Fullstack para gerenciamento de clínica médica, desenvolvido a partir de uma base inicial de API REST e **evoluído com novas funcionalidades, regras de negócio avançadas e integração com IA**.

---

## ⚡ Resumo rápido

* Sistema fullstack de gestão clínica
* Backend em Spring Boot com regras de negócio avançadas
* Frontend em React conectado à API real
* Integração com IA clínica (Anthropic API)
* 157 testes automatizados no backend
* Arquitetura organizada e documentada

---

## 🚀 Visão Geral

O projeto começou como uma API simples de gerenciamento de clínica, mas foi expandido para um sistema mais completo, incluindo:

* Backend robusto com regras de negócio complexas
* Frontend React com módulos operacionais conectados à API
* Integração com serviços de Inteligência Artificial
* Documentação técnica e arquitetura organizada

---

## 🧠 Funcionalidades

* ✔️ Gestão de médicos, pacientes e consultas
* ✔️ Regras de negócio avançadas (além do CRUD básico)
* ✔️ Integração com IA para processamento clínico no backend e no frontend
* ✔️ Estrutura fullstack (backend + frontend)
* ✔️ Dockerização da aplicação
* ✔️ Documentação técnica em `/docs`

---

## 🤖 Integração com IA

O sistema possui um serviço dedicado para integração com IA:

📄 `backend/src/main/java/med/voll/api/service/IaService.java`

Atualmente implementa:

* **Pré-diagnóstico clínico**
  Sugestão de hipóteses diagnósticas, exames e classificação de risco

* **Geração de laudos**
  Conversão de anotações médicas em texto estruturado

* **Resumo de histórico**
  Consolidação de prontuários em uma visão clínica objetiva

### 💡 Exemplo de uso

**POST /ia/pre-diagnostico**

Entrada:

* sintomas
* histórico do paciente

Saída:

* hipóteses diagnósticas
* exames recomendados
* alertas clínicos

---

## 🎨 Frontend

O frontend já possui módulos operacionais conectados à API real e segue uma arquitetura definida:

📄 `frontend/docs/ARCHITECTURE.md`

Tecnologias:

* React 19
* TypeScript
* Vite 7
* Tailwind CSS

Objetivo:

* Interface moderna e responsiva
* Integração completa com o backend
* Telas para dashboard, cadastros, agenda, prontuários, convênios, auditoria e IA clínica

---

## 📚 Regras de Negócio

O sistema possui regras próprias documentadas:

📄 `docs/REGRAS_DE_NEGOCIO.md`

Inclui:

* Disponibilidade real de médicos
* Retorno de consultas
* Prontuário eletrônico com restrições
* Prescrições com validade
* Auditoria LGPD
* Controle de acesso por perfil (RBAC)

---

## ⚙️ Stack

### Backend

| Tecnologia      | Uso                 |
| --------------- | ------------------- |
| Java 17         | Linguagem principal |
| Spring Boot     | API REST            |
| Spring Security | JWT e autorização   |
| Spring Data JPA | Persistência        |
| Flyway          | Migrations          |
| MySQL           | Banco de dados      |

### Frontend

| Tecnologia | Uso       |
| ---------- | --------- |
| React      | Interface |
| TypeScript | Tipagem   |
| Vite       | Build     |
| Tailwind   | Estilo    |

### Infraestrutura

* Docker
* Docker Compose

---

## 📁 Estrutura do Projeto

```bash
.
├── backend/        # Backend Spring Boot
├── frontend/       # Frontend React
├── docs/           # Documentação técnica
├── docker-compose.yml
└── README.md
```

---

## ▶️ Como executar

### Opção A — subir stack fullstack com Docker Compose

Crie o arquivo local de ambiente antes da primeira execução:

```bash
cp backend/.env.example backend/.env
```

> Os valores do `.env.example` são apenas para desenvolvimento local. Troque `JWT_SECRET`, `ADMIN_PASSWORD` e `DB_PASSWORD` fora do ambiente local.

```bash
docker compose --env-file backend/.env up --build
```

Com a stack ativa:

- Frontend: `http://localhost:3000` (ou `FRONTEND_PORT` no `.env`)
- Backend/API: `http://localhost:8080` (ou `BACKEND_PORT` no `.env`)
- Swagger: `http://localhost:8080/swagger-ui.html`
- MySQL no host: `localhost:3307` (ou `DB_PORT` no `.env`)

O frontend em container usa Nginx e proxy `/api` para o backend dentro da rede Docker.

### Opção B — desenvolvimento local

Subir apenas o banco:

```bash
docker compose --env-file backend/.env up -d db
```

Rodar backend:

```bash
cd backend
./mvnw spring-boot:run
```

Rodar frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testes

```bash
cd backend
./mvnw test
```

✔️ Suite atual do backend: **157 testes**

---

## 🔐 Segurança

* Autenticação com JWT
* Controle de acesso por perfil (RBAC)
* Rate limit em endpoints de autenticação
* Auditoria de acesso (LGPD)

Perfis principais:

* `ROLE_ADMIN`
* `ROLE_FUNCIONARIO`
* `ROLE_MEDICO`
* `ROLE_AUDITOR`
* `ROLE_GESTOR`

`ROLE_ADMIN` fica voltado à administração técnica e cadastro/listagem de usuários. Cadastros operacionais, convênios e parâmetros assistenciais ficam com `ROLE_FUNCIONARIO`; a leitura ampla de dados clínicos sensíveis e trilhas de auditoria fica separada em `ROLE_AUDITOR`/`ROLE_GESTOR`.

---

## 📌 Status

🚧 Projeto em evolução ativa

* Backend completo até a migration `V25`
* Frontend conectado à API real, incluindo IA clínica
* Fase 1 do plano de correções concluída: vínculo de usuário médico (`GET /auth/medicos-disponiveis`, cadastro transacional com lock pessimista) — ver `docs/DECISOES_TECNICAS.md`
* Próximos focos sugeridos: otimização de bundle, testes E2E smoke e itens listados em "Pendências conhecidas" (`docs/DECISOES_TECNICAS.md`)

---

## 📸 Demonstração

*(Adicionar GIF ou prints aqui futuramente)*

---

## 📚 Documentação

* `docs/ENDPOINTS.md`
* `docs/REGRAS_DE_NEGOCIO.md`
* `docs/DECISOES_TECNICAS.md`
* `docs/TESTES.md`
* `frontend/docs/ARCHITECTURE.md`

---

## 👨‍💻 Autor

Alexandre Henrique
