package med.voll.api.consulta;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import med.voll.api.paciente.Paciente;

import java.time.LocalDateTime;

public record DadosCadastroConsulta(
        @NotNull // O paciente é obrigatório
        Long idPaciente,

        // O médico é opcional na sua regra, então não deve ter @NotNull
        Long idMedico,

        @NotNull
        @Future // Garante que a data seja no futuro (regra de negócio)
        LocalDateTime data
) {
}
