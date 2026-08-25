package med.voll.api.service;

import med.voll.api.domain.medico.DadosMedicoDisponivelVinculoUsuario;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.usuario.DadosCadastroUsuario;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.exception.ConflitoException;
import med.voll.api.exception.ValidacaoException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final MedicoRepository medicoRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          MedicoRepository medicoRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.medicoRepository = medicoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Page<DadosMedicoDisponivelVinculoUsuario> listarMedicosDisponiveisParaVinculo(Pageable pageable) {
        return medicoRepository.findAllByAtivoTrueAndUsuarioIsNull(pageable)
                .map(DadosMedicoDisponivelVinculoUsuario::new);
    }

    @Transactional
    public Usuario cadastrar(DadosCadastroUsuario dados) {
        validarPerfilEMedico(dados);

        if (usuarioRepository.existsByLogin(dados.login())) {
            throw new ConflitoException("Login já cadastrado");
        }

        var medico = dados.role() == Perfil.ROLE_MEDICO
                ? medicoRepository.findByIdComBloqueio(dados.medicoId())
                    .filter(m -> m.isAtivo() && m.getUsuario() == null)
                    .orElseThrow(() -> new ConflitoException("Médico indisponível para vínculo"))
                : null;

        try {
            var usuario = new Usuario();
            usuario.setLogin(dados.login());
            usuario.setSenha(passwordEncoder.encode(dados.senha()));
            usuario.setRole(dados.role());
            usuario = usuarioRepository.save(usuario);

            if (medico != null) {
                medico.setUsuario(usuario);
                medicoRepository.save(medico);
            }

            return usuario;
        } catch (DataIntegrityViolationException ex) {
            throw new ConflitoException("Dados de usuário ou vínculo já cadastrados");
        }
    }

    private void validarPerfilEMedico(DadosCadastroUsuario dados) {
        if (dados.role() == Perfil.ROLE_ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Perfil ADMIN não é permitido para cadastro");
        }

        if (dados.role() != Perfil.ROLE_MEDICO && dados.medicoId() != null) {
            throw new ValidacaoException("medicoId só pode ser informado para perfil médico");
        }

        if (dados.role() == Perfil.ROLE_MEDICO && dados.medicoId() == null) {
            throw new ValidacaoException("medicoId é obrigatório para perfil médico");
        }
    }
}
