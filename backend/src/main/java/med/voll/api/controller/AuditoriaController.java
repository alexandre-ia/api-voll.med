package med.voll.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import med.voll.api.domain.auditoria.AuditoriaProntuario;
import med.voll.api.domain.auditoria.AuditoriaProntuarioRepository;
import med.voll.api.domain.auditoria.DadosListagemAuditoria;
import med.voll.api.domain.auditoria.RecursoAuditoria;
import med.voll.api.domain.usuario.UsuarioRepository;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("auditoria")
@Tag(name = "Auditoria LGPD", description = "Endpoints para consulta de logs de acesso a prontuários")
public class AuditoriaController {

    private final AuditoriaProntuarioRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaController(AuditoriaProntuarioRepository auditoriaRepository,
                                UsuarioRepository usuarioRepository) {
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/prontuarios/{prontuarioId}")
    @PreAuthorize("hasAnyRole('ROLE_AUDITOR', 'ROLE_GESTOR')")
    @Operation(
            summary = "Logs de acesso ao prontuário",
            description = "Retorna o histórico de acessos a um prontuário (LGPD). Acesso restrito a ROLE_AUDITOR ou ROLE_GESTOR."
    )
    @ApiResponse(responseCode = "200", description = "Histórico retornado com sucesso")
    public ResponseEntity<Page<DadosListagemAuditoria>> listar(
            @PathVariable Long prontuarioId,
            @ParameterObject @PageableDefault(size = 20, sort = "dataHora") Pageable pageable
    ) {
        var page = auditoriaRepository.findAllByProntuarioIdOrderByDataHoraDesc(prontuarioId, pageable);

        return ResponseEntity.ok(mapear(page));
    }

    @GetMapping("/{recursoTipo}/{recursoId}")
    @PreAuthorize("hasAnyRole('ROLE_AUDITOR', 'ROLE_GESTOR')")
    @Operation(
            summary = "Logs de acesso por recurso clínico",
            description = "Retorna o histórico de acessos LGPD a prontuário, prescrição ou atestado."
    )
    @ApiResponse(responseCode = "200", description = "Histórico retornado com sucesso")
    public ResponseEntity<Page<DadosListagemAuditoria>> listarPorRecurso(
            @PathVariable RecursoAuditoria recursoTipo,
            @PathVariable Long recursoId,
            @ParameterObject @PageableDefault(size = 20, sort = "dataHora") Pageable pageable
    ) {
        var page = auditoriaRepository.findAllByRecursoTipoAndRecursoIdOrderByDataHoraDesc(
                recursoTipo, recursoId, pageable);

        return ResponseEntity.ok(mapear(page));
    }

    private Page<DadosListagemAuditoria> mapear(Page<AuditoriaProntuario> page) {
        var ids = page.getContent().stream()
                .map(AuditoriaProntuario::getUsuarioId)
                .collect(Collectors.toSet());
        Map<Long, String> loginMap = usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getUsername()));

        var dtos = page.map(a -> new DadosListagemAuditoria(
                a, loginMap.getOrDefault(a.getUsuarioId(), "ID " + a.getUsuarioId())));
        return dtos;
    }
}
