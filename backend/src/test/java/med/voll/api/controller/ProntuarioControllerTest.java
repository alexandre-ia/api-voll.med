package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.prontuario.*;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.infra.security.TokenService;
import med.voll.api.service.ProntuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProntuarioController.class)
@Import(MethodSecurityTestConfig.class)
class ProntuarioControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ProntuarioService prontuarioService;
    @MockBean TokenService tokenService;
    @MockBean UsuarioRepository usuarioRepository;
    @MockBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private Usuario usuarioMedico() {
        return new Usuario(1L, "medico@test.com", "senha", Perfil.ROLE_MEDICO, null);
    }

    private Usuario usuarioFuncionario() {
        return new Usuario(2L, "func@test.com", "senha", Perfil.ROLE_FUNCIONARIO, null);
    }

    private Usuario usuarioAdmin() {
        return new Usuario(3L, "admin@test.com", "senha", Perfil.ROLE_ADMIN, null);
    }

    private Usuario usuarioAuditor() {
        return new Usuario(4L, "auditor@test.com", "senha", Perfil.ROLE_AUDITOR, null);
    }

    private Usuario usuarioGestor() {
        return new Usuario(5L, "gestor@test.com", "senha", Perfil.ROLE_GESTOR, null);
    }

    private DadosCadastroProntuario dadosCadastro() {
        return new DadosCadastroProntuario(1L, "Paciente relata dor de cabeça", "Sinusite aguda", "J01.9", "Repouso");
    }

    private DadosDetalhamentoProntuario detalhamento() {
        return new DadosDetalhamentoProntuario(1L, 1L, "Dr. João", "Maria", "anamnese", "diagnóstico", "J01.9", "obs", LocalDateTime.now());
    }

    @Test
    @DisplayName("ROLE_MEDICO deve criar prontuário e receber 201")
    void deveCriarProntuarioComMedico() throws Exception {
        when(prontuarioService.criar(any(), any())).thenReturn(detalhamento());

        mvc.perform(post("/prontuarios")
                        .with(user(usuarioMedico())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve criar prontuário — deve receber 403")
    void naoDeveCriarProntuarioComFuncionario() throws Exception {
        mvc.perform(post("/prontuarios")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve listar prontuários e receber 200")
    void deveListarProntuarios() throws Exception {
        when(prontuarioService.listar(any(Pageable.class), any(Usuario.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prontuarios")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve listar prontuários e receber 200")
    void deveListarProntuariosComAuditor() throws Exception {
        when(prontuarioService.listar(any(Pageable.class), any(Usuario.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prontuarios")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_GESTOR deve listar prontuários e receber 200")
    void deveListarProntuariosComGestor() throws Exception {
        when(prontuarioService.listar(any(Pageable.class), any(Usuario.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prontuarios")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve listar prontuários — deve receber 403")
    void naoDeveListarProntuariosComAdmin() throws Exception {
        mvc.perform(get("/prontuarios")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve detalhar prontuário e receber 200")
    void deveDetalharProntuario() throws Exception {
        when(prontuarioService.detalhar(anyLong(), any(Usuario.class))).thenReturn(detalhamento());

        mvc.perform(get("/prontuarios/1")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeMedico").value("Dr. João"));
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve detalhar prontuário e receber 200")
    void deveDetalharProntuarioComAuditor() throws Exception {
        when(prontuarioService.detalhar(anyLong(), any(Usuario.class))).thenReturn(detalhamento());

        mvc.perform(get("/prontuarios/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeMedico").value("Dr. João"));
    }

    @Test
    @DisplayName("ROLE_GESTOR deve detalhar prontuário e receber 200")
    void deveDetalharProntuarioComGestor() throws Exception {
        when(prontuarioService.detalhar(anyLong(), any(Usuario.class))).thenReturn(detalhamento());

        mvc.perform(get("/prontuarios/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeMedico").value("Dr. João"));
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve listar prontuários por paciente e receber 200")
    void deveListarProntuariosPorPacienteComAuditor() throws Exception {
        when(prontuarioService.listarPorPaciente(anyLong(), any(Pageable.class), any(Usuario.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prontuarios/paciente/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_GESTOR deve listar prontuários por paciente e receber 200")
    void deveListarProntuariosPorPacienteComGestor() throws Exception {
        when(prontuarioService.listarPorPaciente(anyLong(), any(Pageable.class), any(Usuario.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prontuarios/paciente/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_MEDICO deve atualizar prontuário e receber 200")
    void deveAtualizarProntuarioComMedico() throws Exception {
        when(prontuarioService.atualizar(any(), any())).thenReturn(detalhamento());

        var dados = new DadosAtualizacaoProntuario(1L, "nova anamnese", null, null, null);

        mvc.perform(put("/prontuarios")
                        .with(user(usuarioMedico())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve atualizar prontuário — deve receber 403")
    void naoDeveAtualizarProntuarioComFuncionario() throws Exception {
        var dados = new DadosAtualizacaoProntuario(1L, "nova anamnese", null, null, null);

        mvc.perform(put("/prontuarios")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dados)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve inativar prontuário e receber 204")
    void deveInativarProntuarioComAuditor() throws Exception {
        mvc.perform(delete("/prontuarios/1")
                        .with(user(usuarioAuditor())).with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve inativar prontuário — deve receber 403")
    void naoDeveInativarProntuarioComAdmin() throws Exception {
        mvc.perform(delete("/prontuarios/1")
                        .with(user(usuarioAdmin())).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_MEDICO não deve inativar prontuário — deve receber 403")
    void naoDeveInativarProntuarioComMedico() throws Exception {
        mvc.perform(delete("/prontuarios/1")
                        .with(user(usuarioMedico())).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("deve rejeitar requisição não autenticada com 401")
    void deveRejeitarRequisicaoNaoAutenticada() throws Exception {
        mvc.perform(get("/prontuarios"))
                .andExpect(status().isUnauthorized());
    }
}
