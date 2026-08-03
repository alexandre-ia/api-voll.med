package med.voll.api.domain.auditoria;

import java.time.LocalDateTime;

public record DadosListagemAuditoria(
        Long id,
        Long prontuarioId,
        RecursoAuditoria recursoTipo,
        Long recursoId,
        String loginUsuario,
        AcaoAuditoria acao,
        LocalDateTime dataHora,
        String ipOrigem
) {
    public DadosListagemAuditoria(AuditoriaProntuario a, String loginUsuario) {
        this(a.getId(), a.getProntuarioId(), a.getRecursoTipo(), a.getRecursoId(), loginUsuario,
                a.getAcao(), a.getDataHora(), a.getIpOrigem());
    }
}
