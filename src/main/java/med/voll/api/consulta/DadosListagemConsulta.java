package med.voll.api.consulta;

import java.time.LocalDateTime;

public record DadosListagemConsulta(
        Long id,
        String nomeMedico,
        String nomePaciente,
        LocalDateTime dataHora
) {
    public DadosListagemConsulta(Consulta consulta) {
        this(
                consulta.getId(),
                consulta.getMedico().getNome(), // Assumindo que a classe Medico tem getNome()
                consulta.getPaciente().getNome(), // Assumindo que a classe Paciente tem getNome()
                consulta.getDataHora()
        );
    }
}