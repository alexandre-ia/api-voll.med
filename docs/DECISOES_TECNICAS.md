# Decisões Técnicas — API Voll.med

Registro de decisões arquiteturais e de design adotadas no projeto, com justificativa. Serve como referência para novos desenvolvedores e para revisões futuras.

---

## Segurança

### Registro de filtros desabilitado (Spring Security 6.5+)

`SecurityFillter` e `RateLimitFilter` são `@Component`, mas são registrados **apenas** via security chain — o auto-registro como Servlet filter está desabilitado via `FilterRegistrationBean` em `SecurityConfigurations`.

**Por quê:** No Spring Security 6.5+, filtros `@Component` com `@Order` causam `IllegalArgumentException: does not have a registered order` se registrados nos dois contextos simultaneamente. Sem os `FilterRegistrationBean`, a aplicação não inicializa.

**Nunca remover** os beans `FilterRegistrationBean` em `SecurityConfigurations`.

---

### Variáveis de ambiente via `application.properties`

O padrão adotado é: variável no `.env` → mapeada em `application.properties` → lida via `@Value("${propriedade.spring}")`.

**Por quê:** Evita acoplamento direto entre código Java e nomes de variáveis de ambiente. Se a variável mudar de nome, só o `application.properties` precisa ser atualizado. Facilita também o uso de valores default via `${prop:default}`.

**Nunca usar** `@Value("${NOME_VARIAVEL_ENV}")` diretamente no código.

---

## Banco de Dados

### `ddl-auto=validate`

O Hibernate valida o schema mas não o altera. Toda mudança estrutural exige migration Flyway.

**Por quê:** Previne alterações acidentais no schema em produção. Garante que as migrations são a fonte de verdade do schema.

---

### Exclusão lógica (soft delete)

Médicos, pacientes, consultas, prontuários e disponibilidades usam o campo `ativo` em vez de `DELETE` físico.

**Por quê:** Preserva histórico clínico e integridade referencial. Um médico inativo ainda aparece em consultas passadas.

---

### Tipo `DayOfWeek` do Java em `disponibilidade_medico`

O campo `dia_semana` usa `VARCHAR(20)` no banco armazenando o nome do enum Java (`MONDAY`, `TUESDAY`, ...).

**Por quê:** Reutiliza o enum padrão do Java sem criar um enum customizado. A query nativa usa `DayOfWeek.name()` para converter.

---

## API e Controllers

### `@ParameterObject` em todos os endpoints com `Pageable`

Todos os parâmetros `Pageable` nos controllers usam `@ParameterObject` do SpringDoc.

**Por quê:** Sem a anotação, o Swagger UI renderiza o `sort` como `array[string]` com valor padrão `["string"]`, que é enviado literalmente ao JPA e causa `InvalidDataAccessApiUsageException`. Com `@ParameterObject`, os parâmetros são expandidos individualmente (`page`, `size`, `sort`).

---

### `ResponseStatusException` no `ProntuarioService`

O service de prontuários usa `ResponseStatusException` em vez de `ValidacaoException` customizada.

**Por quê:** Os erros de prontuário têm códigos HTTP distintos (403, 404, 409, 422) que não se encaixam no padrão 400 da `ValidacaoException`. `ResponseStatusException` permite especificar o status exato sem criar múltiplas classes de exceção.

---

### Controller sem Service para `DisponibilidadeMedico`

O `DisponibilidadeMedicoController` acessa os repositories diretamente, sem uma camada de service separada.

**Por quê:** A lógica é simples (buscar médico → criar/inativar disponibilidade) e não há regras de negócio complexas que justifiquem uma classe extra. Seguindo o princípio de não criar abstrações desnecessárias.

---

## Migrations

### Sequência de migrations

| Faixa | Conteúdo |
|-------|----------|
| V1–V8 | Base: médicos, pacientes, consultas, usuários |
| V9–V11 | Correções e ajustes na base |
| V12 | Prontuário eletrônico |
| V13 | Disponibilidade de médicos |
| V14–V20 | Prescrições, triagem, retorno, atestados, convênios, auditoria LGPD, JPA auditing |
| V21 | Especialidade como tabela (`especialidades`), migração de FK em `medicos` |
| V22 | Tabela `medico_convenios` (N:N médico ↔ convênio) |
| V23 | Ampliação de `pacientes.telefone` de `CHAR(11)` para `VARCHAR(20)` |
| V24 | Constraint única em `medicos.usuario_id` para garantir vínculo 1:1 com usuário médico |
| V25 | Campos `recurso_tipo` e `recurso_id` em `auditoria_prontuario` para trilha LGPD de prescrições e atestados |

Migrations são imutáveis após aplicadas em qualquer ambiente. Para corrigir uma migration já aplicada, criar uma nova.

---

## Domínio

### Integração com IA via `RestClient` (sem SDK externo)

A integração com a Anthropic API usa o `RestClient` nativo do Spring 6 chamando diretamente o endpoint `https://api.anthropic.com/v1/messages`, sem dependência do SDK `anthropic-java`.

**Por quê:** o projeto já tem `RestClient` disponível. Adicionar o SDK seria uma dependência extra sem ganho real — o contrato da API é simples (POST JSON, receber JSON).

**Prompt caching habilitado:** todos os prompts de sistema usam `"cache_control": {"type": "ephemeral"}`, reduzindo custo e latência em chamadas repetidas ao mesmo endpoint.

**Dois modelos distintos por contexto:** `claude-opus-4-7` para pré-diagnóstico (maior precisão clínica) e `claude-sonnet-4-6` para laudo e resumo (velocidade suficiente para texto estruturado).

**Nunca usar** `@Value("${ANTHROPIC_API_KEY}")` diretamente — seguir o padrão do projeto: `.env` → `application.properties` → `@Value("${anthropic.api.key}")`.

---

### Testes de controller com `@WebMvcTest` + `.with(user(usuario))`

Os testes de controller usam `@WebMvcTest` (carrega apenas a camada web) com `SecurityMockMvcRequestPostProcessors.user(new Usuario(...))` para autenticar com um `Usuario` real (não o `User` padrão do Spring Security).

**Por quê:** `@WithMockUser` cria um objeto `User` do Spring Security que não é assignável a `Usuario` customizado — os parâmetros `@AuthenticationPrincipal Usuario usuario` receberiam `null` e causariam `NullPointerException` nos services mockados.

**Como aplicar:** em qualquer teste de controller que use `@AuthenticationPrincipal Usuario`, passar `.with(user(new Usuario(id, login, senha, Perfil.ROLE_XXX, null)))` em vez de `@WithMockUser`.

---

### `IaService` com construtor package-private para testes

`IaService` constrói o `RestClient` internamente no construtor Spring. Para testes unitários, foi adicionado um segundo construtor `package-private` que aceita um `RestClient` pré-construído, sem impactar o comportamento de produção.

**Por quê:** sem esse construtor, testar `IaService` sem contexto Spring seria impossível, pois `RestClient.builder()` não é injetável. Esta é a abordagem padrão para habilitar unit testing de classes que constroem dependências internamente.

**Como aplicar:** usar apenas no mesmo pacote ou em testes — nunca chamar de código de produção.

---

### Estratégia de testes: sem H2 + Flyway, `create-drop` para `@SpringBootTest`

`src/test/resources/application.properties` configura H2 com `spring.flyway.enabled=false` e `spring.jpa.hibernate.ddl-auto=create-drop`. Flyway é desabilitado nos testes para evitar incompatibilidades de sintaxe MySQL com H2.

**Por quê:** algumas migrations usam `MODIFY COLUMN` e sintaxe específica de MySQL que pode ser instável no H2 mesmo em `MODE=MySQL`. O `create-drop` do Hibernate cria o schema diretamente das entidades JPA, que é mais confiável para testes.

**Como aplicar:** testes unitários e `@WebMvcTest` não são afetados (sem JPA). `@SpringBootTest` usa H2 automaticamente pela precedência de `src/test/resources`.

---

### `@WebMvcTest` exige `@MockBean(JpaMetamodelMappingContext.class)` com `@EnableJpaAuditing`

`@EnableJpaAuditing` em `ApiApplication` exige um contexto JPA com metamodel. O slice `@WebMvcTest` não carrega JPA, causando `IllegalArgumentException: JPA metamodel must not be empty`.

**Por quê:** o `JpaAuditingHandler` que implementa auditoria é registrado globalmente e tenta validar o metamodel na inicialização — mesmo em contextos sem JPA.

**Como aplicar:** adicionar `@MockBean(JpaMetamodelMappingContext.class)` a cada classe `@WebMvcTest`.

---

### `@WebMvcTest` não ativa `@EnableMethodSecurity` — usar `@Import(MethodSecurityTestConfig.class)`

O slice `@WebMvcTest` não garante que `SecurityConfigurations` (que contém `@EnableMethodSecurity`) seja carregada. Sem isso, `@PreAuthorize` é ignorado e qualquer usuário autenticado consegue acessar endpoints restritos.

**Por quê:** `@WebMvcTest` usa component scan limitado à camada web. A classe de configuração de segurança pode não ser inicializada se suas dependências não estiverem no contexto do slice.

**Como aplicar:** criar `MethodSecurityTestConfig` em `src/test/java/.../config/` com `@TestConfiguration @EnableMethodSecurity` e importar em cada `@WebMvcTest` com `@Import(MethodSecurityTestConfig.class)`.

---

### Requisições mutantes em `@WebMvcTest` precisam de `.with(csrf())`

Com segurança default no `@WebMvcTest`, CSRF está habilitado. Requisições POST/PUT/DELETE sem token CSRF retornam 403, mesmo com usuário autenticado.

**Como aplicar:** adicionar `.with(csrf())` (import de `SecurityMockMvcRequestPostProcessors`) a todas as requisições mutantes nos testes de controller. O token é ignorado se CSRF estiver desabilitado no ambiente de produção — não há risco em adicioná-lo sempre.

---

### `@WithMockUser` no teste de login (`AutenticacaoControllerTest`)

O teste `deveRetornarTokenAoFazerLogin` usa `@WithMockUser` mesmo sendo o endpoint de login (público).

**Por quê:** `@WebMvcTest` não carrega `SecurityConfigurations` (que tem `.requestMatchers("/auth/login").permitAll()`). O default do Spring Security bloqueia tudo com HTTP 401. `@WithMockUser` injeta um usuário fake para que a requisição chegue ao controller, onde o mock do `AuthenticationManager` processa a autenticação.

**Impacto:** o teste valida a lógica do controller (chamar authenticate → gerar token → retornar 200), não a regra de segurança do endpoint. Essa separação é intencional — testes de controller testam comportamento, não configuração de segurança.

---

### `Especialidade` como entidade (V21)

`Especialidade` foi migrada de enum Java para a entidade `EspecialidadeEntity` + tabela `especialidades`. O cadastro de médico passou a receber `especialidadeId` (Long) em vez do nome do enum.

**Por quê:** com enum fixo, adicionar uma nova especialidade exigia um novo deploy. Com a tabela, basta inserir uma linha via migration ou futuramente via endpoint de administração.

**Impacto na API:** o campo `especialidade` nas respostas continua retornando o nome como string (ex: `"CARDIOLOGIA"`) — sem quebra de compatibilidade nos GETs. O payload do `POST /medicos` passou a usar `"especialidadeId": 1`.
