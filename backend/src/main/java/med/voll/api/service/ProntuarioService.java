package med.voll.api.service;

import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.consulta.ConsultaRepository;
import med.voll.api.domain.prontuario.*;
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
public class ProntuarioService {

    private final ProntuarioRepository prontuarioRepository;
    private final ConsultaRepository consultaRepository;
    private final MedicoRepository medicoRepository;

    public ProntuarioService(ProntuarioRepository prontuarioRepository,
                             ConsultaRepository consultaRepository,
                             MedicoRepository medicoRepository) {
        this.prontuarioRepository = prontuarioRepository;
        this.consultaRepository = consultaRepository;
        this.medicoRepository = medicoRepository;
    }

    @Transactional
    public DadosDetalhamentoProntuario criar(DadosCadastroProntuario dados, Usuario usuarioLogado) {
        var consulta = consultaRepository.findById(dados.consultaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consulta não encontrada"));

        if (!consulta.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consulta está cancelada");
        }

        if (prontuarioRepository.existsByConsultaId(dados.consultaId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um prontuário para esta consulta");
        }

        var medicoLogado = medicoRepository.findByUsuario(usuarioLogado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));

        if (!Objects.equals(consulta.getMedico().getId(), medicoLogado.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o médico que realizou a consulta pode criar o prontuário");
        }

        var prontuario = new Prontuario(
                consulta,
                consulta.getMedico(),
                consulta.getPaciente(),
                dados.anamnese(),
                dados.diagnostico(),
                dados.cid10(),
                dados.observacoes()
        );

        prontuarioRepository.save(prontuario);
        return new DadosDetalhamentoProntuario(prontuario);
    }

    @Transactional
    public DadosDetalhamentoProntuario atualizar(DadosAtualizacaoProntuario dados, Usuario usuarioLogado) {
        var prontuario = prontuarioRepository.findById(dados.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));

        if (!prontuario.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado");
        }

        var medicoLogado = medicoRepository.findByUsuario(usuarioLogado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));

        if (!Objects.equals(prontuario.getMedico().getId(), medicoLogado.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o médico responsável pode editar o prontuário");
        }

        if (!prontuario.podeEditar()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Prontuário não pode ser editado após 24 horas do registro");
        }

        prontuario.atualizar(dados);
        return new DadosDetalhamentoProntuario(prontuario);
    }

    @Transactional(readOnly = true)
    public Page<DadosListagemProntuario> listar(Pageable pageable, Usuario usuarioLogado) {
        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            return prontuarioRepository.findAllByAtivoTrueAndMedicoId(medico.getId(), pageable)
                    .map(DadosListagemProntuario::new);
        }
        return prontuarioRepository.findAllByAtivoTrue(pageable).map(DadosListagemProntuario::new);
    }

    @Transactional(readOnly = true)
    public DadosDetalhamentoProntuario detalhar(Long id, Usuario usuarioLogado) {
        var prontuario = prontuarioRepository.findById(id)
                .filter(Prontuario::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));

        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            if (!Objects.equals(prontuario.getMedico().getId(), medico.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este prontuário");
            }
        }

        return new DadosDetalhamentoProntuario(prontuario);
    }

    @Transactional(readOnly = true)
    public Page<DadosListagemProntuario> listarPorPaciente(Long pacienteId, Pageable pageable, Usuario usuarioLogado) {
        if (usuarioLogado.getAuthorities().contains(Perfil.ROLE_MEDICO)) {
            var medico = medicoRepository.findByUsuario(usuarioLogado)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não possui cadastro de médico"));
            return prontuarioRepository.findAllByAtivoTrueAndMedicoIdAndPacienteId(medico.getId(), pacienteId, pageable)
                    .map(DadosListagemProntuario::new);
        }
        return prontuarioRepository.findAllByAtivoTrueAndPacienteId(pacienteId, pageable)
                .map(DadosListagemProntuario::new);
    }

    @Transactional
    public void inativar(Long id) {
        var prontuario = prontuarioRepository.findById(id)
                .filter(Prontuario::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        prontuario.inativar();
    }
}
