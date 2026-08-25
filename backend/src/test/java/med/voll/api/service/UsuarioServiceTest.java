package med.voll.api.service;

import med.voll.api.domain.medico.Medico;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.usuario.DadosCadastroUsuario;
import med.voll.api.domain.usuario.Perfil;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.exception.ConflitoException;
import med.voll.api.exception.ValidacaoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock MedicoRepository medicoRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks UsuarioService usuarioService;

    @Test
    @DisplayName("deve listar somente projeção de médicos disponíveis para vínculo")
    void deveListarMedicosDisponiveisParaVinculo() {
        var medico = mock(Medico.class);
        when(medico.getId()).thenReturn(1L);
        when(medico.getNome()).thenReturn("Pedro Paulo Pinto");
        when(medico.getCrm()).thenReturn("1542");
        when(medicoRepository.findAllByAtivoTrueAndUsuarioIsNull(any()))
                .thenReturn(new PageImpl<>(List.of(medico), PageRequest.of(0, 100), 1));

        var resultado = usuarioService.listarMedicosDisponiveisParaVinculo(PageRequest.of(0, 100));

        assertThat(resultado.getContent()).hasSize(1);
        assertThat(resultado.getContent().get(0).id()).isEqualTo(1L);
        assertThat(resultado.getContent().get(0).nome()).isEqualTo("Pedro Paulo Pinto");
        assertThat(resultado.getContent().get(0).crm()).isEqualTo("1542");
    }

    @Test
    @DisplayName("deve cadastrar usuário funcionário sem vínculo médico")
    void deveCadastrarFuncionario() {
        var usuarioSalvo = new Usuario(10L, "func@test.com", "encoded", Perfil.ROLE_FUNCIONARIO, null);
        when(usuarioRepository.existsByLogin("func@test.com")).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("encoded");
        when(usuarioRepository.save(any())).thenReturn(usuarioSalvo);

        var resultado = usuarioService.cadastrar(new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null));

        assertThat(resultado).isSameAs(usuarioSalvo);
        verify(medicoRepository, never()).findByIdComBloqueio(any());
        verify(medicoRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve cadastrar usuário médico com médico ativo e sem vínculo")
    void deveCadastrarMedicoComVinculo() {
        var medico = mock(Medico.class);
        var usuarioSalvo = new Usuario(11L, "medico@test.com", "encoded", Perfil.ROLE_MEDICO, null);

        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findByIdComBloqueio(1000L)).thenReturn(Optional.of(medico));
        when(medico.isAtivo()).thenReturn(true);
        when(medico.getUsuario()).thenReturn(null);
        when(passwordEncoder.encode("senha123")).thenReturn("encoded");
        when(usuarioRepository.save(any())).thenReturn(usuarioSalvo);

        var resultado = usuarioService.cadastrar(new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L));

        assertThat(resultado).isSameAs(usuarioSalvo);
        verify(medicoRepository).findByIdComBloqueio(1000L);
        verify(medico).setUsuario(usuarioSalvo);
        verify(medicoRepository).save(medico);
    }

    @Test
    @DisplayName("deve rejeitar usuário médico sem medicoId")
    void deveRejeitarMedicoSemMedicoId() {
        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, null)))
                .isInstanceOf(ValidacaoException.class)
                .hasMessageContaining("medicoId é obrigatório");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar medicoId para perfil não médico")
    void deveRejeitarMedicoIdParaPerfilNaoMedico() {
        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, 1000L)))
                .isInstanceOf(ValidacaoException.class)
                .hasMessageContaining("perfil médico");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar criação de usuário ADMIN")
    void deveRejeitarCadastroAdmin() {
        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("admin2@test.com", "senha123", Perfil.ROLE_ADMIN, null)))
                .isInstanceOf(AccessDeniedException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar login já cadastrado")
    void deveRejeitarLoginExistente() {
        when(usuarioRepository.existsByLogin("func@test.com")).thenReturn(true);

        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null)))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Login já cadastrado");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar médico inexistente")
    void deveRejeitarMedicoInexistente() {
        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findByIdComBloqueio(1000L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L)))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Médico indisponível");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar médico inativo")
    void deveRejeitarMedicoInativo() {
        var medico = mock(Medico.class);
        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findByIdComBloqueio(1000L)).thenReturn(Optional.of(medico));
        when(medico.isAtivo()).thenReturn(false);

        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L)))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Médico indisponível");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve rejeitar médico já vinculado")
    void deveRejeitarMedicoJaVinculado() {
        var medico = mock(Medico.class);
        when(usuarioRepository.existsByLogin("medico@test.com")).thenReturn(false);
        when(medicoRepository.findByIdComBloqueio(1000L)).thenReturn(Optional.of(medico));
        when(medico.isAtivo()).thenReturn(true);
        when(medico.getUsuario()).thenReturn(new Usuario(99L, "outro@test.com", "senha", Perfil.ROLE_MEDICO, null));

        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("medico@test.com", "senha123", Perfil.ROLE_MEDICO, 1000L)))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Médico indisponível");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("deve converter conflito de integridade em 409 de negócio")
    void deveConverterConflitoDeIntegridade() {
        when(usuarioRepository.existsByLogin("func@test.com")).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("encoded");
        when(usuarioRepository.save(any())).thenThrow(new DataIntegrityViolationException("duplicado"));

        assertThatThrownBy(() -> usuarioService.cadastrar(new DadosCadastroUsuario("func@test.com", "senha123", Perfil.ROLE_FUNCIONARIO, null)))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("já cadastrados");
    }
}
