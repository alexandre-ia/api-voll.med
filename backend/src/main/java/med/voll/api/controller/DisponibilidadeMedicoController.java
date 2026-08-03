package med.voll.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import med.voll.api.domain.medico.*;
import med.voll.api.exception.ValidacaoException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("medicos/{medicoId}/disponibilidade")
@Tag(name = "Disponibilidade", description = "Endpoints para gerenciamento de horários de disponibilidade dos médicos")
public class DisponibilidadeMedicoController {

    private final MedicoRepository medicoRepository;
    private final DisponibilidadeMedicoRepository disponibilidadeRepository;

    public DisponibilidadeMedicoController(MedicoRepository medicoRepository,
                                           DisponibilidadeMedicoRepository disponibilidadeRepository) {
        this.medicoRepository = medicoRepository;
        this.disponibilidadeRepository = disponibilidadeRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_FUNCIONARIO')")
    @Operation(summary = "Cadastrar disponibilidade", description = "Cadastra um horário de disponibilidade para o médico")
    public ResponseEntity<DadosListagemDisponibilidade> cadastrar(
            @PathVariable Long medicoId,
            @RequestBody @Valid DadosCadastroDisponibilidade dados,
            UriComponentsBuilder uriBuilder
    ) {
        var medico = medicoRepository.findById(medicoId)
                .filter(Medico::isAtivo)
                .orElseThrow(() -> new ValidacaoException("Médico não encontrado ou inativo"));

        var disponibilidade = new DisponibilidadeMedico(
                medico, dados.diaSemana(), dados.horaInicio(), dados.horaFim());
        disponibilidadeRepository.save(disponibilidade);

        var uri = uriBuilder.path("/medicos/{medicoId}/disponibilidade/{id}")
                .buildAndExpand(medicoId, disponibilidade.getId()).toUri();
        return ResponseEntity.created(uri).body(new DadosListagemDisponibilidade(disponibilidade));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_FUNCIONARIO', 'ROLE_MEDICO', 'ROLE_AUDITOR', 'ROLE_GESTOR')")
    @Operation(summary = "Listar disponibilidade", description = "Lista os horários de disponibilidade ativos do médico")
    public ResponseEntity<List<DadosListagemDisponibilidade>> listar(@PathVariable Long medicoId) {
        var lista = disponibilidadeRepository.findAllByMedicoIdAndAtivoTrue(medicoId)
                .stream().map(DadosListagemDisponibilidade::new).toList();
        return ResponseEntity.ok(lista);
    }

    @DeleteMapping("/{disponibilidadeId}")
    @PreAuthorize("hasRole('ROLE_FUNCIONARIO')")
    @Operation(summary = "Remover disponibilidade", description = "Inativa um horário de disponibilidade do médico")
    public ResponseEntity<Void> remover(
            @PathVariable Long medicoId,
            @PathVariable Long disponibilidadeId
    ) {
        var disponibilidade = disponibilidadeRepository.findById(disponibilidadeId)
                .filter(d -> Objects.equals(d.getMedico().getId(), medicoId) && d.isAtivo())
                .orElseThrow(() -> new ValidacaoException("Disponibilidade não encontrada para este médico"));
        disponibilidade.inativar();
        return ResponseEntity.noContent().build();
    }
}
