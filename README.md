# 🏥 Voll.med API

API REST para gerenciamento de uma clínica médica fictícia chamada **Voll.med**. Permite o cadastro e gerenciamento de médicos, pacientes e consultas, com autenticação de usuários.

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Versão | Descrição |
|---|---|---|
| Java | 21 | Linguagem principal |
| Spring Boot | 3.5.4 | Framework base |
| Spring Web | — | Criação da API REST |
| Spring Data JPA | — | Camada de persistência |
| Spring Security | — | Autenticação e autorização |
| Spring Validation | — | Validação de dados |
| Flyway | — | Migrations do banco de dados |
| MySQL | 8.0 | Banco de dados relacional |
| Lombok | — | Redução de código boilerplate |
| Spring DevTools | — | Reload automático em desenvolvimento |
| Docker / Docker Compose | — | Containerização |
| Maven | 3.9 | Gerenciador de build |

---

## 📁 Estrutura do Projeto

```
src/
└── main/
    ├── java/med/voll/api/
    │   ├── ApiApplication.java         # Classe principal
    │   ├── controller/                 # Endpoints da API
    │   │   ├── AutenticacaoController.java
    │   │   ├── ConsultaController.java
    │   │   ├── MedicoController.java
    │   │   └── PacientesController.java
    │   ├── domain/                     # Regras de negócio e entidades
    │   │   ├── consulta/
    │   │   ├── endereco/
    │   │   ├── medico/
    │   │   ├── paciente/
    │   │   └── usuario/
    │   ├── infra/                      # Configurações de infraestrutura
    │   └── Exception/                  # Tratamento de erros
    └── resources/
        ├── application.properties      # Configurações da aplicação
        └── db/migration/               # Scripts SQL do Flyway (V1 a V7)
```

---

## ⚙️ Pré-requisitos

- **Java 21** ou superior
- **Maven 3.9+**
- **Docker** e **Docker Compose** (para subir o banco de dados)

---

## 🐳 Configuração com Docker

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
DB_HOST=localhost
DB_PORT=3307
DB_NAME=vollmed_api
DB_USER=root
DB_PASSWORD=sua_senha_aqui
```

### 2. Subir o banco de dados

```bash
docker-compose up -d
```

Isso iniciará um container MySQL 8.0 na porta **3307** com o banco `vollmed_api`.

---

## ▶️ Como Executar

### Opção 1 — Localmente com Maven

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd api-voll.med

# Certifique-se de que o banco de dados está rodando via Docker
docker-compose up -d

# Execute a aplicação
./mvnw spring-boot:run
```

### Opção 2 — Via Docker (build completo)

```bash
# Build da imagem Docker
docker build -t api-voll-med .

# Execute o container
docker run -p 8080:8080 --env-file .env api-voll-med
```

A API ficará disponível em: **http://localhost:8080**

---

## 📌 Endpoints da API

> **Nota:** Todos os endpoints (exceto `/login`) requerem autenticação.

### 🔐 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/login` | Realiza login de usuário |

**Body (JSON):**
```json
{
  "login": "usuario@email.com",
  "senha": "senha123"
}
```

---

### 👨‍⚕️ Médicos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/medicos` | Cadastra um novo médico |
| `GET` | `/medicos` | Lista médicos ativos (paginado, ordenado por nome) |
| `GET` | `/medicos/{id}` | Detalha um médico específico |
| `PUT` | `/medicos` | Atualiza dados de um médico |
| `DELETE` | `/medicos/{id}` | Inativa um médico (exclusão lógica) |

**Exemplo de cadastro (POST /medicos):**
```json
{
  "nome": "Dr. João Silva",
  "email": "joao.silva@voll.med",
  "telefone": "11999999999",
  "crm": "123456",
  "especialidade": "CARDIOLOGIA",
  "endereco": {
    "logradouro": "Rua das Flores",
    "bairro": "Centro",
    "cep": "00000000",
    "cidade": "São Paulo",
    "uf": "SP"
  }
}
```

---

### 🧑‍🤝‍🧑 Pacientes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/pacientes` | Cadastra um novo paciente |
| `GET` | `/pacientes` | Lista pacientes ativos (paginado, ordenado por nome) |
| `GET` | `/pacientes/{id}` | Detalha um paciente específico |
| `PUT` | `/pacientes` | Atualiza dados de um paciente |
| `DELETE` | `/pacientes/{id}` | Inativa um paciente (exclusão lógica) |

**Exemplo de cadastro (POST /pacientes):**
```json
{
  "nome": "Maria Oliveira",
  "email": "maria@email.com",
  "telefone": "11988888888",
  "cpf": "12345678909",
  "endereco": {
    "logradouro": "Av. Paulista",
    "bairro": "Bela Vista",
    "cep": "01310100",
    "cidade": "São Paulo",
    "uf": "SP"
  }
}
```

---

### 📅 Consultas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/consultas` | Agenda uma nova consulta |
| `GET` | `/consultas` | Lista consultas ativas (paginado, ordenado por data) |
| `DELETE` | `/consultas` | Cancela uma consulta agendada |

**Exemplo de agendamento (POST /consultas):**
```json
{
  "idPaciente": 1,
  "idMedico": 1,
  "data": "2025-12-10T10:00:00"
}
```

**Exemplo de cancelamento (DELETE /consultas):**
```json
{
  "idConsulta": 1,
  "motivo": "PACIENTE_DESISTIU"
}
```

---

## 🗄️ Banco de Dados — Migrations Flyway

As migrations são aplicadas automaticamente na inicialização:

| Arquivo | Descrição |
|---------|-----------|
| `V1` | Criação da tabela `medicos` |
| `V2` | Adição da coluna `telefone` em médicos |
| `V3` | Criação da tabela `pacientes` |
| `V4` | Adição da coluna `ativo` em médicos |
| `V5` | Adição da coluna `ativo` em pacientes |
| `V6` | Criação da tabela `consultas` |
| `V7` | Criação da tabela `usuarios` |

---

## 🔒 Segurança

A aplicação utiliza **Spring Security**. O endpoint `/login` é público; os demais requerem autenticação válida.

---

## 📝 Observações

- A exclusão de médicos, pacientes e consultas é **lógica** (soft delete), utilizando o campo `ativo`.
- A listagem padrão exibe **10 registros por página**.
- As mensagens de erro não expõem o stack trace ao cliente (`server.error.include-stacktrace=never`).

---

## 📄 Licença

Projeto desenvolvido para fins de aprendizado no curso da **Alura**.
