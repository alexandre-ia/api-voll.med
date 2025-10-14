package med.voll.api.Exception;

// É importante que ela estenda RuntimeException para ser uma exceção não verificada
public class ValidacaoException extends RuntimeException {

    // O construtor recebe a mensagem de erro que será exibida para o usuário/frontend
    public ValidacaoException(String mensagem) {
        super(mensagem);
    }

}