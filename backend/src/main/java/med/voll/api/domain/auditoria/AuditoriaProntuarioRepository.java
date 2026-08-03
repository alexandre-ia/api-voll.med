package med.voll.api.domain.auditoria;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaProntuarioRepository extends JpaRepository<AuditoriaProntuario, Long> {

    Page<AuditoriaProntuario> findAllByProntuarioIdOrderByDataHoraDesc(Long prontuarioId, Pageable pageable);

    Page<AuditoriaProntuario> findAllByRecursoTipoAndRecursoIdOrderByDataHoraDesc(
            RecursoAuditoria recursoTipo, Long recursoId, Pageable pageable);
}
