package med.voll.api.paciente;

import med.voll.api.endereco.DadosEndereco;
import med.voll.api.medico.Especialidade;

public record DadosCadastroPaciente(String nome, String email, String telefone, String cpf, DadosEndereco endereco ) {
}
