package med.voll.api.consulta;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record DadosAgendamentoConsulta(
        @NotNull // O paciente é obrigatório
        Long idPaciente,

        // O médico é opcional na sua regra, então não deve ter @NotNull
        Long idMedico,

        @NotNull
        @Future // Garante que a data seja no futuro (regra de negócio)
        LocalDateTime data
) {
}
