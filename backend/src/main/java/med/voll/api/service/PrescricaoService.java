package med.voll.api.service;

import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.prescricao.*;
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
public class PrescricaoService {

    private final PrescricaoRepository prescricaoRepository;
    private final ProntuarioRepository prontuarioRepository;
    private final MedicoRepository medicoRepository;

    public PrescricaoService(PrescricaoRepository prescricaoRepository,
                             ProntuarioRepository prontuarioRepository,
                             MedicoRepository medicoRepository) {
        this.prescricaoRepository = prescricaoRepository;
        this.prontuarioRepository = prontuarioRepository;
        this.medicoRepository = medicoRepository;
    }

    @Transactional
    public DadosDetalhamentoPrescricao criar(DadosCadastroPrescricao dados, Usuario usuarioLogado) {
        var prontuario = prontuarioRepository.findById(dados.prontuarioId())
                .filter(p -> p.isAtivo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));

        var medicoLogado = medicoRepository.findByUsuario(usuarioLogado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));

        if (!Objects.equals(prontuario.getMedico().getId(), medicoLogado.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas o médico responsável pelo prontuário pode criar prescrições");
        }

        var prescricao = new Prescricao(prontuario, dados.tipo());
        prescricao.adicionarItens(dados.itens());
        prescricaoRepository.save(prescricao);

        return new DadosDetalhamentoPrescricao(prescricao);
    }

    @Transactional(readOnly = true)
    public DadosDetalhamentoPrescricao detalhar(Long id, Usuario usuarioLogado) {
        var prescricao = prescricaoRepository.findById(id)
                .filter(Prescricao::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescrição não encontrada"));

        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            if (!Objects.equals(prescricao.getProntuario().getMedico().getId(), medico.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a esta prescrição");
            }
        }

        return new DadosDetalhamentoPrescricao(prescricao);
    }

    @Transactional(readOnly = true)
    public Page<DadosListagemPrescricao> listarPorProntuario(Long prontuarioId, Pageable pageable, Usuario usuarioLogado) {
        if (!prontuarioRepository.existsById(prontuarioId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado");
        }
        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            return prescricaoRepository
                    .findAllByAtivoTrueAndProntuarioIdAndProntuarioMedicoId(prontuarioId, medico.getId(), pageable)
                    .map(DadosListagemPrescricao::new);
        }
        return prescricaoRepository.findAllByAtivoTrueAndProntuarioId(prontuarioId, pageable)
                .map(DadosListagemPrescricao::new);
    }
}
