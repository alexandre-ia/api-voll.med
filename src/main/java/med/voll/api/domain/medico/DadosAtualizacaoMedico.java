package med.voll.api.domain.medico;

import med.voll.api.domain.endereco.DadosEndereco;
import org.antlr.v4.runtime.misc.NotNull;

public record DadosAtualizacaoMedico(
        @NotNull
        Long id ,
        String nome,
        String telefone,
        DadosEndereco endereco) {

}
