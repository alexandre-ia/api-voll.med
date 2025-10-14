package med.voll.api.consulta;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface ConsultaRepository extends JpaRepository<Consulta, Long> {

    /**
     * Regra: Paciente já tem consulta ATIVA no mesmo dia.
     * Verifica a existência de consultas ATIVAS para o paciente dentro de um intervalo de horas do dia.
     * @param idPaciente ID do paciente.
     * @param primeiroHorario Início do intervalo (ex: 07:00).
     * @param ultimoHorario Fim do intervalo (ex: 19:00).
     * @return true se existir uma consulta ativa no período.
     */
    boolean existsByPacienteIdAndDataHoraBetweenAndAtivoTrue(Long idPaciente, LocalDateTime primeiroHorario, LocalDateTime ultimoHorario);


    /**
     * Regra: Médico já tem consulta ATIVA no mesmo horário.
     * Verifica a existência de consultas ATIVAS para o médico na data e hora exatas.
     * @param idMedico ID do médico.
     * @param dataHora Data e hora exatas da consulta.
     * @return true se o médico já tiver uma consulta ativa agendada neste horário.
     */
    boolean existsByMedicoIdAndDataHoraAndAtivoTrue(Long idMedico, LocalDateTime dataHora);


    /**
     * Método para listagem paginada de consultas ativas.
     */
    Page<Consulta> findAllByAtivoTrue(Pageable paginacao);
}