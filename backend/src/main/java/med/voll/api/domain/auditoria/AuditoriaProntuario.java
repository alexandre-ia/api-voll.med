package med.voll.api.domain.auditoria;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Table(name = "auditoria_prontuario")
@Entity(name = "AuditoriaProntuario")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class AuditoriaProntuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable: list operations don't have a single prontuarioId
    private Long prontuarioId;

    @Enumerated(EnumType.STRING)
    private RecursoAuditoria recursoTipo;

    private Long recursoId;

    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    private AcaoAuditoria acao;

    private LocalDateTime dataHora;

    private String ipOrigem;

    public AuditoriaProntuario(Long prontuarioId, Long usuarioId, AcaoAuditoria acao, String ipOrigem) {
        this(prontuarioId, RecursoAuditoria.PRONTUARIO, prontuarioId, usuarioId, acao, ipOrigem);
    }

    public AuditoriaProntuario(Long prontuarioId, RecursoAuditoria recursoTipo, Long recursoId,
                               Long usuarioId, AcaoAuditoria acao, String ipOrigem) {
        this.prontuarioId = prontuarioId;
        this.recursoTipo = recursoTipo;
        this.recursoId = recursoId;
        this.usuarioId = usuarioId;
        this.acao = acao;
        this.dataHora = LocalDateTime.now();
        this.ipOrigem = ipOrigem;
    }
}
