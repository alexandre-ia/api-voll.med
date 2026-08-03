# Testes Automatizados — API Voll.med

Suite com **137 testes**, 0 falhas. JUnit 5 + Mockito + Spring Boot Test.

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
| `IaServiceTest` | 6 | Mock do `RestClient`, vínculo médico, sem prontuários, pré-diagnóstico, laudo, resumo histórico |

### Testes de controller

| Classe | Testes | O que cobre |
|--------|--------|-------------|
| `AtestadoControllerTest` | 6 | Emitir (MEDICO), detalhar/listar, 403, 401 |
| `AuditoriaControllerTest` | 3 | Acesso à trilha LGPD restrito a AUDITOR/GESTOR |
| `AutenticacaoControllerTest` | 11 | Login (200+token), cadastro/listagem de usuários (ADMIN), validação de vínculo médico, bloqueios por role, login duplicado |
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
