package med.voll.api.controller;

import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.auditoria.AuditoriaProntuarioRepository;
import med.voll.api.domain.auditoria.RecursoAuditoria;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.infra.security.TokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditoriaController.class)
@Import(MethodSecurityTestConfig.class)
class AuditoriaControllerTest {

    @Autowired MockMvc mvc;

    @MockBean AuditoriaProntuarioRepository auditoriaRepository;
    @MockBean TokenService tokenService;
    @MockBean UsuarioRepository usuarioRepository;
    @MockBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private Usuario usuarioAdmin() {
        return new Usuario(1L, "admin@test.com", "senha", Perfil.ROLE_ADMIN, null);
    }

    private Usuario usuarioAuditor() {
        return new Usuario(2L, "auditor@test.com", "senha", Perfil.ROLE_AUDITOR, null);
    }

    private Usuario usuarioGestor() {
        return new Usuario(3L, "gestor@test.com", "senha", Perfil.ROLE_GESTOR, null);
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve consultar auditoria de prontuário e receber 200")
    void deveConsultarAuditoriaComAuditor() throws Exception {
        when(auditoriaRepository.findAllByProntuarioIdOrderByDataHoraDesc(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/auditoria/prontuarios/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_GESTOR deve consultar auditoria de prontuário e receber 200")
    void deveConsultarAuditoriaComGestor() throws Exception {
        when(auditoriaRepository.findAllByProntuarioIdOrderByDataHoraDesc(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/auditoria/prontuarios/1")
                        .with(user(usuarioGestor())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve consultar auditoria clínica — deve receber 403")
    void naoDeveConsultarAuditoriaComAdmin() throws Exception {
        mvc.perform(get("/auditoria/prontuarios/1")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_AUDITOR deve consultar auditoria por recurso clínico e receber 200")
    void deveConsultarAuditoriaPorRecursoComAuditor() throws Exception {
        when(auditoriaRepository.findAllByRecursoTipoAndRecursoIdOrderByDataHoraDesc(
                eq(RecursoAuditoria.PRESCRICAO), eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/auditoria/PRESCRICAO/1")
                        .with(user(usuarioAuditor())))
                .andExpect(status().isOk());
    }
}
