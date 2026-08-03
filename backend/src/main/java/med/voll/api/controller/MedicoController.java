package med.voll.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import med.voll.api.domain.medico.*;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.service.MedicoService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;


@RestController
@RequestMapping("medicos")
@Tag(name = "Médicos", description = "Endpoints para gerenciamento de médicos")
public class MedicoController {

    private final MedicoService medicoService;

    public MedicoController(MedicoService medicoService) {
        this.medicoService = medicoService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_FUNCIONARIO')")
    @Operation(summary = "Cadastrar médico", description = "Cria um novo médico no sistema")
    public  ResponseEntity<DadosDetalhamentoMedico> cadastrar(@RequestBody @Valid DadosCadastroMedico dados, UriComponentsBuilder uriBuilder) {
        var medico = medicoService.cadastrar(dados);
        var uri =uriBuilder.path("/medicos/{id}").buildAndExpand(medico.id()).toUri();
        return ResponseEntity.created(uri).body(medico);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_FUNCIONARIO', 'ROLE_MEDICO', 'ROLE_AUDITOR', 'ROLE_GESTOR')")
    @Operation(summary = "Listar médicos", description = "Lista médicos ativos com paginação")
    public ResponseEntity<Page<DadosListagemMedico>> listar(
            @ParameterObject @PageableDefault(size = 10) Pageable paginacao,
            @AuthenticationPrincipal Usuario usuario) {
        var page = medicoService.listar(paginacao, usuario);
        return ResponseEntity.ok(page);
    }

    @PutMapping
    @PreAuthorize("hasRole('ROLE_FUNCIONARIO')")
    @Operation(summary = "Atualizar médico", description = "Atualiza os dados de um médico")
    public ResponseEntity<DadosDetalhamentoMedico> atualizar(@RequestBody @Valid DadosAtualizacaoMedico dados) {
        var medico = medicoService.atualizar(dados);
        return ResponseEntity.ok(medico);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_FUNCIONARIO')")
    @Operation(summary = "Excluir médico", description = "Realiza exclusão lógica (soft delete) de um médico")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        medicoService.excluir(id);
        return  ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_FUNCIONARIO', 'ROLE_MEDICO', 'ROLE_AUDITOR', 'ROLE_GESTOR')")
    @Operation(summary = "Detalhar médico", description = "Retorna os detalhes de um médico específico")
    public ResponseEntity<DadosDetalhamentoMedico> detalhar(@PathVariable Long id) {
        var medico = medicoService.detalhar(id);
        return  ResponseEntity.ok(medico);
    }

}
