package med.voll.api.domain.consulta;

import med.voll.api.Exception.ValidacaoException; // Import corrigido
import med.voll.api.domain.medico.Medico;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.paciente.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.Optional; // Import necessário para o Optional

@Service
public class AgendaDeConsultas {
    @Autowired
    private ConsultaRepository consultaRepository;

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    public DadosDetalhamentoConsulta agendar(DadosAgendamentoConsulta dados) {

        // 1. Validações de Pré-Requisitos (Inatividade, Existência)
        // Busca o Paciente e verifica a inatividade
        var paciente = pacienteRepository.findById(dados.idPaciente());
        if (paciente.isEmpty() || !paciente.get().isAtivo()) {
            throw new ValidacaoException("Paciente não existe ou está inativo no sistema!");
        }

        Medico medico = null; // Inicializa o médico fora do bloco

        // Se o médico for informado (opcional), verifica se existe e inatividade
        if (dados.idMedico() != null) {
            var medicoOptional = medicoRepository.findById(dados.idMedico());
            if (medicoOptional.isEmpty() || !medicoOptional.get().isAtivo()) {
                throw new ValidacaoException("Médico não existe ou está inativo no sistema!");
            }
            medico = medicoOptional.get();
        }

        // 2. Validações de Regras de Negócio
        validarHorarioFuncionamento(dados.data());
        validarAntecedenciaMinima(dados.data());
        validarPacienteComOutraConsultaNoDia(dados);

        // Escolhe o médico (se não foi informado, será aleatório)
        if (medico == null) {
            medico = escolherMedicoAleatorio(dados);
        } else {
            validarMedicoOcupado(medico.getId(), dados.data());
        }

        if (medico == null) {
            throw new ValidacaoException("Não existe médico disponível na data e horário informados!");
        }

        // 3. Persistência
        var consulta = new Consulta(medico, paciente.get(), dados.data());
        consultaRepository.save(consulta);

        // 4. Retorno
        return new DadosDetalhamentoConsulta(consulta);
    }

    // ------------------ MÉTODO DE CANCELAMENTO ------------------

    public void cancelar(DadosCancelamentoConsulta dados) {
        if (!consultaRepository.existsById(dados.idConsulta())) {
            throw new ValidacaoException("ID da consulta informado não existe!");
        }

        var consulta = consultaRepository.getReferenceById(dados.idConsulta());

        // Validação: Somente poderá ser cancelada com antecedência mínima de 24 horas.
        if (consulta.getDataHora().isBefore(LocalDateTime.now().plusHours(24))) {
            throw new ValidacaoException("Consulta somente pode ser cancelada com antecedência mínima de 24 horas.");
        }

        // Se a validação passar:
        consulta.cancelar(dados.motivo()); // Marca como inativo e registra o motivo
    }


    // ------------------ MÉTODOS DE VALIDAÇÃO DE REGRA DE NEGÓCIO ------------------

    private void validarHorarioFuncionamento(LocalDateTime data) {
        // ... (lógica de Horário de Funcionamento - Sem alteração) ...
        var diaDaSemana = data.getDayOfWeek();
        var hora = data.getHour();

        // 1. Horário de funcionamento: Seg a Sáb, das 07:00 às 19:00
        if (diaDaSemana == DayOfWeek.SUNDAY) {
            throw new ValidacaoException("Clínica não funciona aos domingos.");
        }

        if (hora < 7 || hora >= 19) {
            throw new ValidacaoException("Horário de agendamento fora do funcionamento da clínica.");
        }
    }

    private void validarAntecedenciaMinima(LocalDateTime data) {
        // ... (lógica de Antecedência de 30 minutos - Sem alteração) ...
        var agora = LocalDateTime.now();
        var trintaMinutosAFrente = agora.plusMinutes(30);

        // 2. Consultas devem ser agendadas com antecedência mínima de 30 minutos
        if (data.isBefore(trintaMinutosAFrente)) {
            throw new ValidacaoException("Consulta deve ser agendada com antecedência mínima de 30 minutos.");
        }
    }

    private void validarPacienteComOutraConsultaNoDia(DadosAgendamentoConsulta dados) {
        var primeiroHorario = dados.data().withHour(7).withMinute(0);
        var ultimoHorario = dados.data().withHour(19).withMinute(0);

        // CORREÇÃO: Usando o método do Repository com o sufixo AndAtivoTrue
        if (consultaRepository.existsByPacienteIdAndDataHoraBetweenAndAtivoTrue(dados.idPaciente(), primeiroHorario, ultimoHorario)) {
            throw new ValidacaoException("Paciente já possui uma consulta agendada neste dia.");
        }
    }

    private void validarMedicoOcupado(Long idMedico, LocalDateTime dataHora) {
        // Valida se o médico está ocupado no horário (regra 7)
        if (consultaRepository.existsByMedicoIdAndDataHoraAndAtivoTrue(idMedico, dataHora)) {
            throw new ValidacaoException("Médico já possui outra consulta ATIVA agendada neste horário.");
        }
    }

    private Medico escolherMedicoAleatorio(DadosAgendamentoConsulta dados) {
        // Se o médico não foi fornecido no DTO, buscamos um aleatório disponível.
        Optional<Medico> medicoOptional = medicoRepository.escolherMedicoAleatorioLivreNaData(dados.data());

        // Retorna o médico se ele existir, ou 'null' se Optional estiver vazio
        return medicoOptional.orElse(null);
    }

    // O método 'escolherMedico(DadosAgendamentoConsulta dados)' original foi dividido em:
    // 1. Lógica de checagem do médico no método 'agendar'
    // 2. Método auxiliar 'validarMedicoOcupado'
    // 3. Método auxiliar 'escolherMedicoAleatorio'
}