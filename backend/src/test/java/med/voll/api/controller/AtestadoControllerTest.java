package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.atestado.*;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.infra.security.TokenService;
import med.voll.api.service.AtestadoService;
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

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AtestadoController.class)
@Import(MethodSecurityTestConfig.class)
class AtestadoControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AtestadoService atestadoService;
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

    private DadosCadastroAtestado dadosCadastro() {
        return new DadosCadastroAtestado(1L, 3, "J11.1", "Repouso absoluto");
    }

    private DadosDetalhamentoAtestado detalhamento() {
        return new DadosDetalhamentoAtestado(1L, 1L, 3, "J11.1", LocalDate.now(), "Repouso absoluto");
    }

    @Test
    @DisplayName("ROLE_MEDICO deve emitir atestado e receber 201")
    void deveEmitirAtestadoComMedico() throws Exception {
        when(atestadoService.emitir(any(), any())).thenReturn(detalhamento());

        mvc.perform(post("/atestados")
                        .with(user(usuarioMedico())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diasAfastamento").value(3));
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve emitir atestado — deve receber 403")
    void naoDeveEmitirAtestadoComFuncionario() throws Exception {
        mvc.perform(post("/atestados")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve detalhar atestado e receber 200")
    void deveDetalharAtestado() throws Exception {
        when(atestadoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/atestados/1")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cid10").value("J11.1"));
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve detalhar atestado e receber 200")
    void deveDetalharAtestadoComAuditor() throws Exception {
        when(atestadoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/atestados/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cid10").value("J11.1"));
    }

    @Test
    @DisplayName("ROLE_GESTOR deve detalhar atestado e receber 200")
    void deveDetalharAtestadoComGestor() throws Exception {
        when(atestadoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/atestados/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cid10").value("J11.1"));
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve detalhar atestado — deve receber 403")
    void naoDeveDetalharAtestadoComAdmin() throws Exception {
        mvc.perform(get("/atestados/1")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve listar atestados por paciente e receber 200")
    void deveListarAtestadosPorPaciente() throws Exception {
        when(atestadoService.listarPorPaciente(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/atestados/paciente/1")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve listar atestados por paciente e receber 200")
    void deveListarAtestadosPorPacienteComAuditor() throws Exception {
        when(atestadoService.listarPorPaciente(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/atestados/paciente/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_GESTOR deve listar atestados por paciente e receber 200")
    void deveListarAtestadosPorPacienteComGestor() throws Exception {
        when(atestadoService.listarPorPaciente(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/atestados/paciente/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("deve rejeitar requisição não autenticada com 401")
    void deveRejeitarRequisicaoNaoAutenticada() throws Exception {
        mvc.perform(get("/atestados/1"))
                .andExpect(status().isUnauthorized());
    }
}
