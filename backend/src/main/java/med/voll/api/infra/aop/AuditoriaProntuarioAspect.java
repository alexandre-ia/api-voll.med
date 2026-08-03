package med.voll.api.infra.aop;

import med.voll.api.domain.auditoria.AcaoAuditoria;
import med.voll.api.domain.auditoria.RecursoAuditoria;
import med.voll.api.domain.atestado.DadosDetalhamentoAtestado;
import med.voll.api.domain.prescricao.DadosDetalhamentoPrescricao;
import med.voll.api.domain.prontuario.DadosDetalhamentoProntuario;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.service.AuditoriaProntuarioService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class AuditoriaProntuarioAspect {

    private final AuditoriaProntuarioService auditoriaService;

    public AuditoriaProntuarioAspect(AuditoriaProntuarioService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @Around("execution(* med.voll.api.service.ProntuarioService.*(..)) " +
            "|| execution(* med.voll.api.service.PrescricaoService.*(..)) " +
            "|| execution(* med.voll.api.service.AtestadoService.*(..))")
    public Object auditar(ProceedingJoinPoint jp) throws Throwable {
        String metodo = jp.getSignature().getName();
        Object[] args = jp.getArgs();
        Object resultado = null;

        try {
            resultado = jp.proceed();
            return resultado;
        } finally {
            try {
                RecursoAuditado recurso = extrairRecurso(jp.getSignature().getDeclaringTypeName(), metodo, args, resultado);
                Long usuarioId = extrairUsuarioId();
                String ip = extrairIp();
                AcaoAuditoria acao = mapearAcao(metodo);

                auditoriaService.registrar(recurso.prontuarioId(), recurso.tipo(), recurso.id(), usuarioId, acao, ip);
            } catch (Exception e) {
                // Auditoria nunca deve impedir o fluxo principal
            }
        }
    }

    private RecursoAuditado extrairRecurso(String classe, String metodo, Object[] args, Object resultado) {
        if (classe.endsWith("PrescricaoService")) {
            return switch (metodo) {
                case "criar", "detalhar" -> resultado instanceof DadosDetalhamentoPrescricao d
                        ? new RecursoAuditado(d.prontuarioId(), RecursoAuditoria.PRESCRICAO, d.id())
                        : RecursoAuditado.prescricao(null);
                case "listarPorProntuario" -> args.length > 0 && args[0] instanceof Long id
                        ? new RecursoAuditado(id, RecursoAuditoria.PRONTUARIO, id)
                        : RecursoAuditado.prontuario(null);
                default -> RecursoAuditado.prescricao(null);
            };
        }

        if (classe.endsWith("AtestadoService")) {
            return switch (metodo) {
                case "emitir", "detalhar" -> resultado instanceof DadosDetalhamentoAtestado d
                        ? new RecursoAuditado(d.prontuarioId(), RecursoAuditoria.ATESTADO, d.id())
                        : RecursoAuditado.atestado(null);
                default -> RecursoAuditado.atestado(null);
            };
        }

        Long prontuarioId = switch (metodo) {
            // id vem do retorno após persistência
            case "criar", "atualizar" -> resultado instanceof DadosDetalhamentoProntuario d ? d.id() : null;
            // primeiro argumento é o prontuarioId
            case "detalhar", "inativar" -> args.length > 0 && args[0] instanceof Long id ? id : null;
            // listar / listarPorPaciente: sem prontuarioId específico
            default -> null;
        };
        return RecursoAuditado.prontuario(prontuarioId);
    }

    private record RecursoAuditado(Long prontuarioId, RecursoAuditoria tipo, Long id) {
        private static RecursoAuditado prontuario(Long id) {
            return new RecursoAuditado(id, RecursoAuditoria.PRONTUARIO, id);
        }

        private static RecursoAuditado prescricao(Long id) {
            return new RecursoAuditado(null, RecursoAuditoria.PRESCRICAO, id);
        }

        private static RecursoAuditado atestado(Long id) {
            return new RecursoAuditado(null, RecursoAuditoria.ATESTADO, id);
        }
    }

    private Long extrairUsuarioId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Usuario usuario) {
            return (long) usuario.getId();
        }
        return null;
    }

    private String extrairIp() {
        try {
            var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                return attrs.getRequest().getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private AcaoAuditoria mapearAcao(String metodo) {
        return switch (metodo) {
            case "criar", "emitir" -> AcaoAuditoria.CRIOU;
            case "atualizar", "inativar" -> AcaoAuditoria.EDITOU;
            default -> AcaoAuditoria.VISUALIZOU;
        };
    }
}
