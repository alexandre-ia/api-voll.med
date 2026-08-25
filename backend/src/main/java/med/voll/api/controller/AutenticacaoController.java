package med.voll.api.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import med.voll.api.domain.medico.DadosMedicoDisponivelVinculoUsuario;
import med.voll.api.domain.usuario.DadosAutenticacao;
import med.voll.api.domain.usuario.DadosCadastroUsuario;
import med.voll.api.domain.usuario.DadosDetalhamentoUsuario;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.domain.usuario.UsuarioRepository;
import med.voll.api.infra.security.DadosTokenJWT;
import med.voll.api.infra.security.TokenService;
import med.voll.api.service.UsuarioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticação", description = "Endpoints para autenticação e cadastro de usuários")
public class AutenticacaoController {

    private final AuthenticationManager manager;
    private final TokenService tokenService;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;

    public AutenticacaoController(AuthenticationManager manager,
                                   TokenService tokenService,
                                   UsuarioRepository usuarioRepository,
                                   UsuarioService usuarioService) {
        this.manager = manager;
        this.tokenService = tokenService;
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    @Operation(summary = "Autenticar usuário", description = "Realiza a autenticação do usuário e retorna o token JWT")
    public ResponseEntity<DadosTokenJWT> autenticar(@RequestBody @Valid DadosAutenticacao dados) {
        var authenticationToken = new UsernamePasswordAuthenticationToken(dados.login(), dados.senha());
        var authentication = manager.authenticate(authenticationToken);
        var tokenJWT = tokenService.gerarToken((Usuario) authentication.getPrincipal());
        return ResponseEntity.ok(new DadosTokenJWT(tokenJWT));
    }

    @PostMapping("/cadastro")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @Operation(summary = "Cadastrar novo usuário", description = "Cria um novo usuário operacional. Requer perfil ADMIN. Não é possível criar outro ADMIN por esta rota.")
    public ResponseEntity<DadosDetalhamentoUsuario> cadastrar(@RequestBody @Valid DadosCadastroUsuario dados) {
        var usuario = usuarioService.cadastrar(dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(new DadosDetalhamentoUsuario(usuario));
    }

    @GetMapping("/medicos-disponiveis")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @Operation(summary = "Listar médicos disponíveis para vínculo", description = "Retorna médicos ativos que ainda não possuem usuário vinculado. Requer perfil ADMIN.")
    public ResponseEntity<Page<DadosMedicoDisponivelVinculoUsuario>> listarMedicosDisponiveis(
            @PageableDefault(size = 100, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(usuarioService.listarMedicosDisponiveisParaVinculo(pageable));
    }

    @GetMapping("/usuarios")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @Operation(summary = "Listar usuários", description = "Retorna todos os usuários cadastrados. Requer perfil ADMIN.")
    public ResponseEntity<Page<DadosDetalhamentoUsuario>> listar(
            @PageableDefault(size = 10, sort = "login") Pageable pageable) {
        var page = usuarioRepository.findAll(pageable).map(DadosDetalhamentoUsuario::new);
        return ResponseEntity.ok(page);
    }
}
