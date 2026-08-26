package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.prescricao.*;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.infra.security.TokenService;
import med.voll.api.service.PrescricaoService;
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

@WebMvcTest(PrescricaoController.class)
@Import(MethodSecurityTestConfig.class)
class PrescricaoControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PrescricaoService prescricaoService;
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

    private DadosCadastroPrescricao dadosCadastro() {
        var item = new DadosCadastroItemPrescricao("Amoxicilina", "500mg", "1 comprimido de 8/8h", "7 dias");
        return new DadosCadastroPrescricao(1L, TipoPrescricao.SIMPLES, List.of(item));
    }

    private DadosDetalhamentoPrescricao detalhamento() {
        return new DadosDetalhamentoPrescricao(1L, 1L, TipoPrescricao.SIMPLES,
                LocalDate.now(), LocalDate.now().plusDays(30), List.of());
    }

    @Test
    @DisplayName("ROLE_MEDICO deve criar prescrição e receber 201")
    void deveCriarPrescricaoComMedico() throws Exception {
        when(prescricaoService.criar(any(), any())).thenReturn(detalhamento());

        mvc.perform(post("/prescricoes")
                        .with(user(usuarioMedico())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("SIMPLES"));
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve criar prescrição — deve receber 403")
    void naoDeveCriarPrescricaoComFuncionario() throws Exception {
        mvc.perform(post("/prescricoes")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dadosCadastro())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve detalhar prescrição e receber 200")
    void deveDetalharPrescricao() throws Exception {
        when(prescricaoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/prescricoes/1")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("SIMPLES"));
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve detalhar prescrição e receber 200")
    void deveDetalharPrescricaoComAuditor() throws Exception {
        when(prescricaoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/prescricoes/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("SIMPLES"));
    }

    @Test
    @DisplayName("ROLE_GESTOR deve detalhar prescrição e receber 200")
    void deveDetalharPrescricaoComGestor() throws Exception {
        when(prescricaoService.detalhar(anyLong(), any())).thenReturn(detalhamento());

        mvc.perform(get("/prescricoes/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("SIMPLES"));
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve detalhar prescrição — deve receber 403")
    void naoDeveDetalharPrescricaoComAdmin() throws Exception {
        mvc.perform(get("/prescricoes/1")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve listar prescrições por prontuário e receber 200")
    void deveListarPrescricoesPorProntuario() throws Exception {
        when(prescricaoService.listarPorProntuario(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prescricoes/prontuario/1")
                        .with(user(usuarioFuncionario())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve listar prescrições por prontuário e receber 200")
    void deveListarPrescricoesPorProntuarioComAuditor() throws Exception {
        when(prescricaoService.listarPorProntuario(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prescricoes/prontuario/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_GESTOR deve listar prescrições por prontuário e receber 200")
    void deveListarPrescricoesPorProntuarioComGestor() throws Exception {
        when(prescricaoService.listarPorProntuario(anyLong(), any(Pageable.class), any()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/prescricoes/prontuario/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("deve rejeitar requisição não autenticada com 401")
    void deveRejeitarRequisicaoNaoAutenticada() throws Exception {
        mvc.perform(get("/prescricoes/1"))
                .andExpect(status().isUnauthorized());
    }
}
