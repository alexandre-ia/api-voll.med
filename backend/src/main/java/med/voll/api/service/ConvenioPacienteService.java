package med.voll.api.service;

import med.voll.api.domain.convenio.ConvenioRepository;
import med.voll.api.domain.paciente.*;
import med.voll.api.exception.ValidacaoException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

@Service
public class ConvenioPacienteService {

    private final ConvenioPacienteRepository convenioPacienteRepository;
    private final PacienteRepository pacienteRepository;
    private final ConvenioRepository convenioRepository;

    public ConvenioPacienteService(ConvenioPacienteRepository convenioPacienteRepository,
                                   PacienteRepository pacienteRepository,
                                   ConvenioRepository convenioRepository) {
        this.convenioPacienteRepository = convenioPacienteRepository;
        this.pacienteRepository = pacienteRepository;
        this.convenioRepository = convenioRepository;
    }

    @Transactional
    public DadosDetalhamentoConvenioPaciente associar(Long pacienteId, DadosCadastroConvenioPaciente dados) {
        var paciente = pacienteRepository.findById(pacienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado"));

        if (!paciente.isAtivo()) {
            throw new ValidacaoException("Paciente está inativo.");
        }

        var convenio = convenioRepository.findById(dados.convenioId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convênio não encontrado"));

        if (!convenio.isAtivo()) {
            throw new ValidacaoException("Convênio está inativo.");
        }

        if (convenioPacienteRepository.existsByPacienteIdAndConvenioIdAndAtivoTrue(pacienteId, dados.convenioId())) {
            throw new ValidacaoException("Paciente já possui este convênio cadastrado.");
        }

        var convenioPaciente = new ConvenioPaciente(paciente, convenio, dados);
        convenioPacienteRepository.save(convenioPaciente);
        return new DadosDetalhamentoConvenioPaciente(convenioPaciente);
    }

    @Transactional(readOnly = true)
    public Page<DadosDetalhamentoConvenioPaciente> listarPorPaciente(Long pacienteId, Pageable pageable) {
        return convenioPacienteRepository
                .findAllByPacienteIdAndAtivoTrue(pacienteId, pageable)
                .map(DadosDetalhamentoConvenioPaciente::new);
    }

    @Transactional
    public void remover(Long pacienteId, Long convenioPacienteId) {
        var cp = convenioPacienteRepository.findById(convenioPacienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vínculo não encontrado"));

        if (!Objects.equals(cp.getPaciente().getId(), pacienteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este vínculo não pertence ao paciente informado");
        }

        cp.inativar();
    }
}
