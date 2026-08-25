package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.medico.DadosMedicoDisponivelVinculoUsuario;
import med.voll.api.domain.usuario.*;
import med.voll.api.infra.security.TokenService;
import med.voll.api.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AutenticacaoController.class)
@Import(MethodSecurityTestConfig.class)
class AutenticacaoControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AuthenticationManager authenticationManager;
    @MockBean TokenService tokenService;
    @MockBean UsuarioRepository usuarioRepository;
    @MockBean UsuarioService usuarioService;
    @MockBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private Usuario usuarioAdmin() {
        return new Usuario(1L, "admin@test.com", "senha", Perfil.ROLE_ADMIN, null);
    }

    private Usuario usuarioFuncionario() {
        return new Usuario(2L, "func@test.com", "senha", Perfil.ROLE_FUNCIONARIO, null);
    }

    private Usuario usuarioAuditor() {
        return new Usuario(3L, "auditor@test.com", "senha", Perfil.ROLE_AUDITOR, null);
    }

    @Test
    @WithMockUser
    @DisplayName("login válido deve retornar token JWT com 200")
    void deveRetornarTokenAoFazerLogin() throws Exception {
        var usuarioAutenticado = usuarioAdmin();
        var auth = new UsernamePasswordAuthenticationToken(usuarioAutenticado, null, usuarioAutenticado.getAuthorities());

        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(tokenService.gerarToken(any())).thenReturn("mocked.jwt.token");

        var dados = new DadosAutenticacao("admin@test.com", "senha123");

        mvc.perform(post("/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenJWT").value("mocked.jwt.token"));
    }

    @Test
    @DisplayName("ROLE_ADMIN deve cadastrar novo usuário FUNCIONARIO e receber 201")
    void deveCadastrarUsuarioComAdmin() throws Exception {
        var novoUsuario = new Usuario(10L, "novo@test.com", "encodedSenha", Perfil.ROLE_FUNCIONARIO, null);

        when(usuarioService.cadastrar(any())).thenReturn(novoUsuario);

        var dados = new DadosCadastroUsuario("novo@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.login").value("novo@test.com"))
                .andExpect(jsonPath("$.role").value("ROLE_FUNCIONARIO"));
    }

    @Test
    @DisplayName("ROLE_ADMIN deve cadastrar novo usuário AUDITOR e receber 201")
    void deveCadastrarUsuarioAuditorComAdmin() throws Exception {
        var novoUsuario = new Usuario(11L, "auditor@test.com", "encodedSenha", Perfil.ROLE_AUDITOR, null);

        when(usuarioService.cadastrar(any())).thenReturn(novoUsuario);

        var dados = new DadosCadastroUsuario("auditor@test.com", "senha123", Perfil.ROLE_AUDITOR, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ROLE_AUDITOR"));
    }

    @Test
    @DisplayName("ROLE_ADMIN deve cadastrar usuário MEDICO com medicoId válido e vincular médico")
    void deveCadastrarUsuarioMedicoComMedicoValido() throws Exception {
        var novoUsuario = new Usuario(12L, "medico@test.com", "encodedSenha", Perfil.ROLE_MEDICO, null);

        when(usuarioService.cadastrar(any())).thenReturn(novoUsuario);

        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.1"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ROLE_MEDICO"));

        verify(usuarioService).cadastrar(any());
    }

    @Test
    @DisplayName("ROLE_MEDICO sem medicoId deve retornar 400 e não salvar usuário")
    void naoDeveCadastrarUsuarioMedicoSemMedicoId() throws Exception {
        when(usuarioService.cadastrar(any()))
                .thenThrow(new med.voll.api.exception.ValidacaoException("medicoId é obrigatório para perfil médico"));

        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.2"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isBadRequest());

        verify(usuarioService).cadastrar(any());
    }

    @Test
    @DisplayName("ROLE_MEDICO com médico inválido ou já vinculado deve retornar 409 e não salvar usuário")
    void naoDeveCadastrarUsuarioMedicoComMedicoIndisponivel() throws Exception {
        when(usuarioService.cadastrar(any()))
                .thenThrow(new med.voll.api.exception.ConflitoException("Médico indisponível para vínculo"));

        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.3"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isConflict());

        verify(usuarioService).cadastrar(any());
    }

    @Test
    @DisplayName("perfil não médico não deve aceitar medicoId")
    void naoDeveCadastrarUsuarioNaoMedicoComMedicoId() throws Exception {
        when(usuarioService.cadastrar(any()))
                .thenThrow(new med.voll.api.exception.ValidacaoException("medicoId só pode ser informado para perfil médico"));

        var dados = new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.4"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isBadRequest());

        verify(usuarioService).cadastrar(any());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve criar outro ROLE_ADMIN — deve receber 403")
    void naoDeveCadastrarOutroAdmin() throws Exception {
        when(usuarioService.cadastrar(any()))
                .thenThrow(new org.springframework.security.access.AccessDeniedException("Perfil ADMIN não é permitido para cadastro"));

        var dados = new DadosCadastroUsuario("outro@test.com", "senha123", Perfil.ROLE_ADMIN, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("deve retornar 409 quando login já existe")
    void deveRetornar409QuandoLoginJaExiste() throws Exception {
        when(usuarioService.cadastrar(any()))
                .thenThrow(new med.voll.api.exception.ConflitoException("Login já cadastrado"));

        var dados = new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("ROLE_ADMIN deve listar médicos disponíveis para vínculo")
    void deveListarMedicosDisponiveisParaVinculoComAdmin() throws Exception {
        var pagina = new PageImpl<>(
                List.of(new DadosMedicoDisponivelVinculoUsuario(1000L, "Pedro Paulo Pinto", "1542")),
                PageRequest.of(0, 100),
                1
        );

        when(usuarioService.listarMedicosDisponiveisParaVinculo(any())).thenReturn(pagina);

        mvc.perform(get("/auth/medicos-disponiveis")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1000))
                .andExpect(jsonPath("$.content[0].nome").value("Pedro Paulo Pinto"))
                .andExpect(jsonPath("$.content[0].crm").value("1542"))
                .andExpect(jsonPath("$.content[0].email").doesNotExist());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve listar médicos disponíveis para vínculo")
    void naoDeveListarMedicosDisponiveisParaVinculoComFuncionario() throws Exception {
        mvc.perform(get("/auth/medicos-disponiveis")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isForbidden());

        verify(usuarioService, never()).listarMedicosDisponiveisParaVinculo(any());
    }

    @Test
    @DisplayName("usuário não autenticado não deve listar médicos disponíveis para vínculo")
    void naoDeveListarMedicosDisponiveisParaVinculoSemAutenticacao() throws Exception {
        mvc.perform(get("/auth/medicos-disponiveis"))
                .andExpect(status().isUnauthorized());

        verify(usuarioService, never()).listarMedicosDisponiveisParaVinculo(any());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve cadastrar usuário — deve receber 403")
    void naoDeveCadastrarUsuarioComFuncionario() throws Exception {
        var dados = new DadosCadastroUsuario("novo@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_AUDITOR não deve cadastrar usuário — deve receber 403")
    void naoDeveCadastrarUsuarioComAuditor() throws Exception {
        var dados = new DadosCadastroUsuario("novo@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAuditor())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isForbidden());
    }
}
