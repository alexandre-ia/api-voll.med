package med.voll.api.medico;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;


public interface MedicoRepository extends JpaRepository<Medico, Long> {


    // Método para listagem paginada (já estava correto)
    Page<Medico> findAllByAtivoTrue(Pageable paginacao);

    /**
     * Busca um médico ATIVO que não possua consulta agendada na data/hora informada,
     * e o ordena aleatoriamente para selecionar um.
     * Este é o método que o AgendaDeConsultas deve chamar para a lógica aleatória.
     * * @param dataHora A data e hora da consulta.
     * @return Um objeto Optional contendo o Medico, se encontrado.
     */
    @Query(value = """
        SELECT m.* FROM medicos m
        LEFT JOIN consultas c ON c.medico_id = m.id AND c.data_hora = :dataHora AND c.ativo = true
        WHERE m.ativo = true
        AND c.id IS NULL
        ORDER BY RAND() -- ALTERADO DE random() PARA RAND()
        LIMIT 1
    """, nativeQuery = true)
    Optional<Medico> escolherMedicoAleatorioLivreNaData(@Param("dataHora") LocalDateTime dataHora);
}
