package med.voll.api.service;

import med.voll.api.domain.atestado.*;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.prontuario.ProntuarioRepository;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

@Service
public class AtestadoService {

    private final AtestadoRepository atestadoRepository;
    private final ProntuarioRepository prontuarioRepository;
    private final MedicoRepository medicoRepository;

    public AtestadoService(AtestadoRepository atestadoRepository,
                           ProntuarioRepository prontuarioRepository,
                           MedicoRepository medicoRepository) {
        this.atestadoRepository = atestadoRepository;
        this.prontuarioRepository = prontuarioRepository;
        this.medicoRepository = medicoRepository;
    }

    @Transactional
    public DadosDetalhamentoAtestado emitir(DadosCadastroAtestado dados, Usuario usuarioLogado) {
        var prontuario = prontuarioRepository.findById(dados.prontuarioId())
                .filter(p -> p.isAtivo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));

        var medicoLogado = medicoRepository.findByUsuario(usuarioLogado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));

        if (!Objects.equals(prontuario.getMedico().getId(), medicoLogado.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas o médico responsável pelo prontuário pode emitir atestados");
        }

        var atestado = new Atestado(prontuario, dados);
        atestadoRepository.save(atestado);
        return new DadosDetalhamentoAtestado(atestado);
    }

    @Transactional(readOnly = true)
    public DadosDetalhamentoAtestado detalhar(Long id, Usuario usuarioLogado) {
        var atestado = atestadoRepository.findById(id)
                .filter(Atestado::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Atestado não encontrado"));

        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            if (!Objects.equals(atestado.getProntuario().getMedico().getId(), medico.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este atestado");
            }
        }

        return new DadosDetalhamentoAtestado(atestado);
    }

    @Transactional(readOnly = true)
    public Page<DadosListagemAtestado> listarPorPaciente(Long pacienteId, Pageable pageable, Usuario usuarioLogado) {
        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            return atestadoRepository
                    .findAllByAtivoTrueAndProntuarioPacienteIdAndProntuarioMedicoId(pacienteId, medico.getId(), pageable)
                    .map(DadosListagemAtestado::new);
        }
        return atestadoRepository.findAllByAtivoTrueAndProntuarioPacienteId(pacienteId, pageable)
                .map(DadosListagemAtestado::new);
    }
}
