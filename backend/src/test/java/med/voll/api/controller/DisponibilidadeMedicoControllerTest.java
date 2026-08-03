package med.voll.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import med.voll.api.config.MethodSecurityTestConfig;
import med.voll.api.domain.medico.DisponibilidadeMedico;
import med.voll.api.domain.medico.DisponibilidadeMedicoRepository;
import med.voll.api.domain.medico.Medico;
import med.voll.api.domain.medico.MedicoRepository;
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
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DisponibilidadeMedicoController.class)
@Import(MethodSecurityTestConfig.class)
class DisponibilidadeMedicoControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean MedicoRepository medicoRepository;
    @MockBean DisponibilidadeMedicoRepository disponibilidadeRepository;
    @MockBean TokenService tokenService;
    @MockBean UsuarioRepository usuarioRepository;
    @MockBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private Usuario usuarioAdmin() {
        return new Usuario(1L, "admin@test.com", "senha", Perfil.ROLE_ADMIN, null);
    }

    private Usuario usuarioFuncionario() {
        return new Usuario(2L, "func@test.com", "senha", Perfil.ROLE_FUNCIONARIO, null);
    }

    private Usuario usuarioMedico() {
        return new Usuario(3L, "medico@test.com", "senha", Perfil.ROLE_MEDICO, null);
    }

    private Medico medicoAtivo(Long id) {
        var medico = mock(Medico.class);
        when(medico.getId()).thenReturn(id);
        when(medico.isAtivo()).thenReturn(true);
        return medico;
    }

    private DisponibilidadeMedico disponibilidade(Medico medico) {
        return new DisponibilidadeMedico(1L, medico, DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), true);
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve cadastrar disponibilidade")
    void deveCadastrarDisponibilidadeComFuncionario() throws Exception {
        var medico = medicoAtivo(1000L);
        when(medicoRepository.findById(1000L)).thenReturn(Optional.of(medico));

        var body = """
                {"diaSemana":"MONDAY","horaInicio":"08:00:00","horaFim":"12:00:00"}
                """;

        mvc.perform(post("/medicos/1000/disponibilidade")
                        .with(user(usuarioFuncionario())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("ROLE_ADMIN não deve listar disponibilidade")
    void naoDeveListarDisponibilidadeComAdmin() throws Exception {
        mvc.perform(get("/medicos/1000/disponibilidade")
                        .with(user(usuarioAdmin())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_MEDICO deve listar disponibilidade")
    void deveListarDisponibilidadeComMedico() throws Exception {
        when(disponibilidadeRepository.findAllByMedicoIdAndAtivoTrue(1000L)).thenReturn(List.of());

        mvc.perform(get("/medicos/1000/disponibilidade")
                        .with(user(usuarioMedico())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO deve remover disponibilidade do médico correto")
    void deveRemoverDisponibilidadeDoMedicoCorreto() throws Exception {
        var medico = medicoAtivo(1000L);
        when(disponibilidadeRepository.findById(1L)).thenReturn(Optional.of(disponibilidade(medico)));

        mvc.perform(delete("/medicos/1000/disponibilidade/1")
                        .with(user(usuarioFuncionario())).with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("ROLE_FUNCIONARIO não deve remover disponibilidade de outro médico")
    void naoDeveRemoverDisponibilidadeDeOutroMedico() throws Exception {
        var medico = medicoAtivo(1000L);
        when(disponibilidadeRepository.findById(1L)).thenReturn(Optional.of(disponibilidade(medico)));

        mvc.perform(delete("/medicos/1001/disponibilidade/1")
                        .with(user(usuarioFuncionario())).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ROLE_MEDICO não deve cadastrar disponibilidade")
    void naoDeveCadastrarDisponibilidadeComMedico() throws Exception {
        var body = """
                {"diaSemana":"MONDAY","horaInicio":"08:00:00","horaFim":"12:00:00"}
                """;

        mvc.perform(post("/medicos/1000/disponibilidade")
                        .with(user(usuarioMedico())).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }
}
