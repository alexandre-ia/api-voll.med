package med.voll.api.controller;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import med.voll.api.domain.consulta.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("consultas") // É comum usar o plural (consultas) em APIs REST
public class ConsultaController {

    // Injeta a classe Service que contém toda a lógica de negócio
    @Autowired
    private AgendaDeConsultas agenda;

    @Autowired
    private ConsultaRepository consultaRepository;

    /**
     * Endpoint para Agendar uma nova consulta.
     * Mapeia para POST /consultas
     * @param dados DTO com idPaciente, idMedico (opcional) e data/hora.
     * @return 200 OK com os detalhes da consulta agendada.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<DadosDetalhamentoConsulta> agendar(@RequestBody @Valid DadosAgendamentoConsulta dados) {

        // Delega o processamento da requisição e todas as validações de regra de negócio ao Service
        DadosDetalhamentoConsulta detalhamento = agenda.agendar(dados);

        // Retorna o status 200 OK e o detalhamento da consulta
        return ResponseEntity.ok(detalhamento);
    }

    /**
     * NOVO MÉTODO: Endpoint para visualizar todas as consultas paginadas e ordenadas.
     * Mapeia para GET /consultas
     * @param paginacao Parâmetro opcional de paginação (page, size, sort).
     * @return 200 OK com a página de DTOs de listagem.
     */
    @GetMapping
    public ResponseEntity<Page<DadosListagemConsulta>> listar(
            @PageableDefault(size = 10, sort = {"dataHora"}) Pageable paginacao
    ) {
        // Busca as consultas ATIVAS e as mapeia para o DTO de listagem
        // A listagem deve ser ordenada por nome/data e paginada, trazendo 10 registros por página,
        // conforme as regras de Pacientes/Médicos.
        // Usamos findAllByAtivoTrue para listar apenas consultas que ainda não foram canceladas.
        Page<DadosListagemConsulta> page = consultaRepository
                .findAllByAtivoTrue(paginacao)
                .map(DadosListagemConsulta::new);

        return ResponseEntity.ok(page);
    }

    /**
     * Endpoint para Cancelar uma consulta agendada.
     * Mapeia para DELETE /consultas
     * @param dados DTO com idConsulta e o motivo obrigatório.
     * @return 204 No Content.
     */
    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> cancelar(@RequestBody @Valid DadosCancelamentoConsulta dados) {

        // Delega a validação (como a regra de 24h) e o cancelamento (exclusão lógica) ao Service
        agenda.cancelar(dados);

        // Retorna o status 204 (No Content), que é o padrão para exclusão/cancelamento bem-sucedido
        return ResponseEntity.noContent().build();
    }
}
