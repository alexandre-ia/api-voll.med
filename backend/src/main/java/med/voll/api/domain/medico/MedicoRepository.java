package med.voll.api.domain.medico;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import med.voll.api.domain.usuario.Usuario;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;


public interface MedicoRepository extends JpaRepository<Medico, Long> {


    // Método para listagem paginada (já estava correto)
    Page<Medico> findAllByAtivoTrue(Pageable paginacao);

    Page<Medico> findAllByAtivoTrueAndUsuarioIsNull(Pageable paginacao);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Medico m WHERE m.id = :id")
    Optional<Medico> findByIdComBloqueio(@Param("id") Long id);

    @Query("SELECT m FROM Medico m WHERE m.ativo = true AND m.usuario.id = :usuarioId")
    Page<Medico> findAllByAtivoTrueAndUsuarioId(Pageable paginacao, @Param("usuarioId") Long usuarioId);

    Optional<Medico> findByUsuario(Usuario usuario);

    /**
     * Busca um médico ATIVO que não possua consulta agendada na data/hora informada,
     * e o ordena aleatoriamente para selecionar um.
     * Este é o método que o AgendaDeConsultas deve chamar para a lógica aleatória.
     * * @param dataHora A data e hora da consulta.
     * @return Um objeto Optional contendo o Medico, se encontrado.
     */
    @Query(value = """
        SELECT m.* FROM medicos m
        INNER JOIN disponibilidade_medico d ON d.medico_id = m.id
            AND d.dia_semana = :diaSemana
            AND d.hora_inicio <= :hora
            AND d.hora_fim > :hora
            AND d.ativo = true
        LEFT JOIN consultas c ON c.medico_id = m.id
            AND c.data_hora = :dataHora
            AND c.ativo = true
        WHERE m.ativo = true
        AND c.id IS NULL
        ORDER BY RAND()
        LIMIT 1
    """, nativeQuery = true)
    Optional<Medico> escolherMedicoAleatorioLivreNaData(
            @Param("dataHora") LocalDateTime dataHora,
            @Param("diaSemana") String diaSemana,
            @Param("hora") LocalTime hora);
}
