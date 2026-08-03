package med.voll.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import med.voll.api.domain.ia.DadosGerarLaudo;
import med.voll.api.domain.ia.DadosPreDiagnostico;
import med.voll.api.domain.ia.DadosRespostaIa;
import med.voll.api.domain.usuario.Usuario;
import med.voll.api.service.IaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("ia")
@PreAuthorize("hasRole('ROLE_MEDICO')")
@Tag(name = "IA Clínica", description = "Assistente de inteligência artificial para suporte médico")
public class IaController {

    private final IaService iaService;

    public IaController(IaService iaService) {
        this.iaService = iaService;
    }

    @PostMapping("/pre-diagnostico")
    @Operation(
            summary = "Pré-diagnóstico",
            description = "Gera hipóteses diagnósticas, exames sugeridos e classificação de risco com base nos sintomas. Usa claude-opus-4-7.")
    public ResponseEntity<DadosRespostaIa> preDiagnostico(
            @RequestBody @Valid DadosPreDiagnostico dados,
            @AuthenticationPrincipal Usuario usuario
    ) {
        return ResponseEntity.ok(iaService.gerarPreDiagnostico(dados.consultaId(), dados.sintomas(), usuario));
    }

    @PostMapping("/gerar-laudo")
    @Operation(
            summary = "Gerar laudo",
            description = "Estrutura um laudo clínico profissional a partir de anotações livres do médico. Usa claude-sonnet-4-6.")
    public ResponseEntity<DadosRespostaIa> gerarLaudo(
            @RequestBody @Valid DadosGerarLaudo dados,
            @AuthenticationPrincipal Usuario usuario
    ) {
        return ResponseEntity.ok(iaService.gerarLaudo(dados.prontuarioId(), dados.anotacoes(), usuario));
    }

    @GetMapping("/resumo-historico/{pacienteId}")
    @Operation(
            summary = "Resumo do histórico",
            description = "Gera resumo clínico consolidado com base nos prontuários do paciente. Usa claude-sonnet-4-6.")
    public ResponseEntity<DadosRespostaIa> resumoHistorico(
            @PathVariable Long pacienteId,
            @AuthenticationPrincipal Usuario usuario
    ) {
        return ResponseEntity.ok(iaService.resumirHistorico(pacienteId, usuario));
    }
}
