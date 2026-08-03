package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.medico.Medico;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.usuario.*;
import med.voll.api.infra.security.TokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
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
    @MockBean MedicoRepository medicoRepository;
    @MockBean PasswordEncoder passwordEncoder;
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

        when(usuarioRepository.existsByLogin("novo@test.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encodedSenha");
        when(usuarioRepository.save(any())).thenReturn(novoUsuario);

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

        when(usuarioRepository.existsByLogin("auditor@test.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encodedSenha");
        when(usuarioRepository.save(any())).thenReturn(novoUsuario);

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
        var medico = mock(Medico.class);
        var novoUsuario = new Usuario(12L, "medico@test.com", "encodedSenha", Perfil.ROLE_MEDICO, null);

        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findById(1000L)).thenReturn(Optional.of(medico));
        when(medico.isAtivo()).thenReturn(true);
        when(medico.getUsuario()).thenReturn(null);
        when(passwordEncoder.encode(any())).thenReturn("encodedSenha");
        when(usuarioRepository.save(any())).thenReturn(novoUsuario);

        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.1"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ROLE_MEDICO"));

        verify(medico).setUsuario(novoUsuario);
        verify(medicoRepository).save(medico);
    }

    @Test
    @DisplayName("ROLE_MEDICO sem medicoId deve retornar 400 e não salvar usuário")
    void naoDeveCadastrarUsuarioMedicoSemMedicoId() throws Exception {
        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.2"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("ROLE_MEDICO com médico inválido ou já vinculado deve retornar 409 e não salvar usuário")
    void naoDeveCadastrarUsuarioMedicoComMedicoIndisponivel() throws Exception {
        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findById(1000L)).thenReturn(Optional.empty());

        var dados = new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.3"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isConflict());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("perfil não médico não deve aceitar medicoId")
    void naoDeveCadastrarUsuarioNaoMedicoComMedicoId() throws Exception {
        var dados = new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, 1000L);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .with(request -> { request.setRemoteAddr("10.0.0.4"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve criar outro ROLE_ADMIN — deve receber 403")
    void naoDeveCadastrarOutroAdmin() throws Exception {
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
        when(usuarioRepository.existsByLogin("func@test.com")).thenReturn(true);

        var dados = new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null);

        mvc.perform(post("/auth/cadastro")
                        .with(user(usuarioAdmin())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isConflict());
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
