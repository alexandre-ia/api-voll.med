# Testes Automatizados — API Voll.med

Suite com **157 testes**, 0 falhas. JUnit 5 + Mockito + Spring Boot Test.

---

## Como executar

```bash
# Entrar no backend a partir da raiz
cd backend

# Suite completa
./mvnw test

# Classe específica
./mvnw test -Dtest=AgendaDeConsultasTest

# Múltiplas classes
./mvnw test -Dtest="ConsultaControllerTest,AgendaDeConsultasTest"
```

No frontend, executar a partir de `frontend/`:

```bash
npm test
npm run check
npm run build
npm audit
```

`npm test` roda Vitest + Testing Library (5 arquivos, 22 testes), incluindo `pages/Users.test.tsx` — carregamento/vazio/erro/retry do seletor de médicos disponíveis, payload de cadastro (com e sem `medicoId`) e tradução do perfil `ROLE_ADMIN` na listagem.

`npm audit` reporta atualmente 1 vulnerabilidade alta (transitiva, `nanoid` via `postcss`), pendente de correção — não introduzida pelo fluxo de cadastro de usuário.

---

## Estratégia

### Testes unitários (`@ExtendWith(MockitoExtension.class)`)

Sem contexto Spring. Testam lógica isolada com dependências mockadas via Mockito.

- **Quando usar:** services com regras de negócio complexas, validadores de domínio
- **Velocidade:** rápidos (< 1s por classe)

### Testes de controller (`@WebMvcTest`)

Carregam apenas a camada web (controller + segurança). Services são `@MockBean`. Sem JPA, sem banco.

- **Quando usar:** validar rotas, roles (`@PreAuthorize`), status HTTP, serialização JSON
- **Configurações necessárias:** `@Import(MethodSecurityTestConfig.class)` + `@MockBean(JpaMetamodelMappingContext.class)` (ver `docs/DECISOES_TECNICAS.md`)

---

## Classes de teste

### Testes de domínio / service

| Classe | Testes | O que cobre |
|--------|--------|-------------|
| `ApiApplicationTests` | 1 | Inicialização do contexto Spring Boot com H2 e configurações de teste |
| `AgendaDeConsultasTest` | 17 | Todas as validações de agendamento (horário, antecedência, disponibilidade, convênio) e cancelamento |
| `ProntuarioServiceTest` | 7 | Criação (403/409/400), edição (422 janela expirada, 403 médico errado), 404 |
| `EspecialidadeServiceTest` | 8 | CRUD, nome duplicado (409), inativação |
| `UsuarioServiceTest` | 11 | Listagem de médicos disponíveis, cadastro (funcionário/médico), médico inexistente/inativo/já vinculado (409), medicoId ausente/indevido (400), tentativa de criar ADMIN (403), login duplicado (409), conflito de integridade concorrente (409) |
| `IaServiceTest` | 6 | Mock do `RestClient`, vínculo médico, sem prontuários, pré-diagnóstico, laudo, resumo histórico |
| `AuditoriaProntuarioAspectTest` | 2 | Auditoria AOP para prescrição e atestado com tipo/id de recurso clínico |
| `SecurityFillterTest` | 3 | Validação de token JWT, autenticação no `SecurityContext` e bypass de requisições sem token |

### Testes de controller

| Classe | Testes | O que cobre |
|--------|--------|-------------|
| `AtestadoControllerTest` | 6 | Emitir (MEDICO), detalhar/listar, 403, 401 |
| `AuditoriaControllerTest` | 4 | Acesso à trilha LGPD por prontuário/recurso restrito a AUDITOR/GESTOR |
| `AutenticacaoControllerTest` | 14 | Login (200+token), cadastro/listagem de usuários (ADMIN), validação de vínculo médico, bloqueios por role, login duplicado, `GET /auth/medicos-disponiveis` (200 ADMIN, 403 demais perfis, 401 anônimo) |
| `ConsultaControllerTest` | 7 | Agendar/cancelar (FUNCIONARIO), listar por roles, 403 para ações indevidas |
| `ConvenioControllerTest` | 10 | CRUD de convênios, paginação, permissões por role |
| `ConvenioPacienteControllerTest` | 6 | Associar/listar/remover convênio do paciente e permissões |
| `DisponibilidadeMedicoControllerTest` | 6 | RBAC e operações de disponibilidade médica |
| `EspecialidadeControllerTest` | 10 | CRUD (FUNCIONARIO), listar/detalhar por roles, bloqueios |
| `MedicoControllerTest` | 8 | CRUD, 401 sem auth, 403 para MEDICO em escrita e 403 para ADMIN na leitura operacional |
| `MedicoConvenioControllerTest` | 4 | Vincular/listar/remover convênios aceitos pelo médico |
| `PacientesControllerTest` | 10 | CRUD, listagem/detalhamento filtrado, 401 sem auth, 403 em endpoints restritos |
| `PrescricaoControllerTest` | 6 | Criar (MEDICO), detalhar/listar, 403, 401 |
| `ProntuarioControllerTest` | 11 | Criar/editar (MEDICO), inativar (AUDITOR/GESTOR), listar/detalhar por roles, 403 |

---

## Configurações de teste

### `MethodSecurityTestConfig`

```java
@TestConfiguration
@EnableMethodSecurity
public class MethodSecurityTestConfig {}
```

Necessário porque `@WebMvcTest` não garante que `@EnableMethodSecurity` seja ativado. Sem isso, `@PreAuthorize` é ignorado.

### `backend/src/test/resources/application.properties`

```properties
spring.datasource.url=jdbc:h2:mem:testdb
spring.config.import=
spring.flyway.enabled=false
spring.jpa.hibernate.ddl-auto=create-drop
api.security.token.secret=testSecretKeyForTestingPurposesAtLeast32Chars
```

H2 em memória. Flyway desabilitado — algumas migrations usam sintaxe MySQL incompatível com H2. O schema é criado pelo Hibernate a partir das entidades JPA.

---

## Padrões de autenticação nos testes

### `@WebMvcTest` com `@AuthenticationPrincipal Usuario`

Usar `.with(user(new Usuario(id, login, senha, Perfil.ROLE_XXX, null)))` — não `@WithMockUser`.

`@WithMockUser` cria um `User` padrão do Spring Security, não assignável ao `Usuario` customizado. O parâmetro `@AuthenticationPrincipal Usuario` receberia `null`.

```java
mvc.perform(post("/consultas")
    .with(user(new Usuario(1L, "func@test.com", "senha", Perfil.ROLE_FUNCIONARIO, null)))
    .with(csrf())
    ...)
```

### Exceção: `AutenticacaoControllerTest.deveRetornarTokenAoFazerLogin`

Usa `@WithMockUser` porque o endpoint `/auth/login` é público mas `@WebMvcTest` não carrega a config de segurança real. Ver `docs/DECISOES_TECNICAS.md` para detalhes.

### Requisições mutantes (POST/PUT/DELETE)

Sempre adicionar `.with(csrf())`. Sem CSRF token, Spring Security retorna 403 mesmo com usuário autenticado.

### Validação dos containers

O erro `SQL State: 08S01 / Communications link failure` no `backend-voll` indica falha de conexão inicial com o MySQL. A configuração Docker Compose usa healthcheck SQL real no `db` e retries do Flyway para evitar corrida de inicialização entre MySQL e backend.

O erro `SQL State: HY000 / Error Code: 1130` com mensagem `Host '<ip>' is not allowed to connect to this MySQL server`, ou `Access denied for user 'root'@'localhost'` ao testar o próprio container, normalmente indica volume MySQL antigo com senha/grants incompatíveis com o `backend/.env` atual. Em ambiente local descartável, recriar o volume resolve:

```bash
docker compose --env-file backend/.env down -v
docker compose --env-file backend/.env up --build
```

Não usar `down -v` se houver dados locais que precisam ser preservados.

Com Docker Desktop ativo, validar a stack com:

```bash
docker compose --env-file backend/.env config
docker compose --env-file backend/.env up --build
docker compose --env-file backend/.env ps
```

Endpoints esperados após subir:

- Frontend: `http://localhost:3000`
- Backend/Swagger: `http://localhost:8080/swagger-ui.html`

