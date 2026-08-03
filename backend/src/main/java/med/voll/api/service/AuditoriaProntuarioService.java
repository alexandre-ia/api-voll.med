package med.voll.api.service;

import med.voll.api.domain.auditoria.AcaoAuditoria;
import med.voll.api.domain.auditoria.AuditoriaProntuario;
import med.voll.api.domain.auditoria.AuditoriaProntuarioRepository;
import med.voll.api.domain.auditoria.RecursoAuditoria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditoriaProntuarioService {

    private final AuditoriaProntuarioRepository auditoriaRepository;

    public AuditoriaProntuarioService(AuditoriaProntuarioRepository auditoriaRepository) {
        this.auditoriaRepository = auditoriaRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(Long prontuarioId, Long usuarioId, AcaoAuditoria acao, String ipOrigem) {
        auditoriaRepository.save(new AuditoriaProntuario(prontuarioId, usuarioId, acao, ipOrigem));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(Long prontuarioId, RecursoAuditoria recursoTipo, Long recursoId,
                          Long usuarioId, AcaoAuditoria acao, String ipOrigem) {
        auditoriaRepository.save(new AuditoriaProntuario(prontuarioId, recursoTipo, recursoId, usuarioId, acao, ipOrigem));
    }
}
