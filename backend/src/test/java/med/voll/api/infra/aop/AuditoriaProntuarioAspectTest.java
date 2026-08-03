package med.voll.api.infra.aop;

import med.voll.api.domain.atestado.DadosDetalhamentoAtestado;
import med.voll.api.domain.auditoria.AcaoAuditoria;
import med.voll.api.domain.auditoria.RecursoAuditoria;
import med.voll.api.domain.prescricao.DadosDetalhamentoPrescricao;
import med.voll.api.domain.prescricao.TipoPrescricao;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.service.AuditoriaProntuarioService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditoriaProntuarioAspectTest {

    @Mock AuditoriaProntuarioService auditoriaService;
    @Mock ProceedingJoinPoint joinPoint;
    @Mock Signature signature;

    AuditoriaProntuarioAspect aspect;

    @BeforeEach
    void setUp() {
        aspect = new AuditoriaProntuarioAspect(auditoriaService);
        var usuario = new Usuario(10L, "medico@test.com", "senha", Perfil.ROLE_MEDICO, null);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(usuario, null, usuario.getAuthorities()));

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("deve auditar detalhe de prescrição com tipo e recurso")
    void deveAuditarDetalheDePrescricao() throws Throwable {
        var retorno = new DadosDetalhamentoPrescricao(9L, 5L, TipoPrescricao.SIMPLES,
                LocalDate.now(), LocalDate.now().plusDays(30), List.of());

        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getName()).thenReturn("detalhar");
        when(signature.getDeclaringTypeName()).thenReturn("med.voll.api.service.PrescricaoService");
        when(joinPoint.getArgs()).thenReturn(new Object[]{9L, null});
        when(joinPoint.proceed()).thenReturn(retorno);

        aspect.auditar(joinPoint);

        verify(auditoriaService).registrar(5L, RecursoAuditoria.PRESCRICAO, 9L,
                10L, AcaoAuditoria.VISUALIZOU, "127.0.0.1");
    }

    @Test
    @DisplayName("deve auditar emissão de atestado com tipo e recurso")
    void deveAuditarEmissaoDeAtestado() throws Throwable {
        var retorno = new DadosDetalhamentoAtestado(11L, 5L, 3, "J11.1", LocalDate.now(), "Repouso");

        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getName()).thenReturn("emitir");
        when(signature.getDeclaringTypeName()).thenReturn("med.voll.api.service.AtestadoService");
        when(joinPoint.getArgs()).thenReturn(new Object[]{null, null});
        when(joinPoint.proceed()).thenReturn(retorno);

        aspect.auditar(joinPoint);

        verify(auditoriaService).registrar(5L, RecursoAuditoria.ATESTADO, 11L,
                10L, AcaoAuditoria.CRIOU, "127.0.0.1");
    }
}
