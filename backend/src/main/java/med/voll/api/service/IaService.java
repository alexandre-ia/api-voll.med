package med.voll.api.service;

import med.voll.api.domain.consulta.ConsultaRepository;
import med.voll.api.domain.ia.DadosRespostaIa;
import med.voll.api.domain.medico.Medico;
import med.voll.api.domain.medico.MedicoRepository;
import med.voll.api.domain.prontuario.ProntuarioRepository;
import med.voll.api.domain.usuario.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class IaService {

    private static final String SYSTEM_PRE_DIAGNOSTICO = """
            Você é um assistente médico de suporte ao diagnóstico clínico. \
            Ajude o médico a identificar hipóteses diagnósticas com base nos sintomas relatados. \
            Apresente sempre: hipóteses diagnósticas prováveis, exames complementares sugeridos, \
            sinais de alerta e classificação de risco (baixo/médio/alto). \
            Seja objetivo e baseado em evidências. Nunca substitua o julgamento médico.""";

    private static final String SYSTEM_LAUDO = """
            Você é um assistente especializado em redigir laudos clínicos estruturados em português brasileiro. \
            A partir das anotações do médico, produza um laudo profissional com: \
            1) Introdução formal, 2) Anamnese organizada, 3) Impressão diagnóstica, \
            4) Plano terapêutico sugerido. Mantenha linguagem técnica e formal.""";

    private static final String SYSTEM_RESUMO = """
            Você é um assistente clínico de análise de histórico médico. \
            Analise os prontuários fornecidos e produza um resumo consolidado com: \
            principais queixas ao longo do tempo, frequência de retorno, \
            padrões clínicos recorrentes e alertas relevantes (ex: condição crônica, pressão elevada frequente). \
            Seja conciso e clínico.""";

    private final RestClient restClient;
    private final ProntuarioRepository prontuarioRepository;
    private final ConsultaRepository consultaRepository;
    private final MedicoRepository medicoRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public IaService(@Value("${anthropic.api.key}") String apiKey,
                     ProntuarioRepository prontuarioRepository,
                     ConsultaRepository consultaRepository,
                     MedicoRepository medicoRepository) {
        this.prontuarioRepository = prontuarioRepository;
        this.consultaRepository = consultaRepository;
        this.medicoRepository = medicoRepository;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.anthropic.com/v1/messages")
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .build();
    }

    // Construtor para testes — permite injetar RestClient mockado
    IaService(RestClient restClient, ProntuarioRepository prontuarioRepository,
              ConsultaRepository consultaRepository, MedicoRepository medicoRepository) {
        this.restClient = restClient;
        this.prontuarioRepository = prontuarioRepository;
        this.consultaRepository = consultaRepository;
        this.medicoRepository = medicoRepository;
    }

    public DadosRespostaIa gerarPreDiagnostico(Long consultaId, String sintomas, Usuario usuarioLogado) {
        var medicoLogado = medicoLogado(usuarioLogado);
        consultaRepository.findById(consultaId)
                .filter(c -> c.isAtivo() && Objects.equals(c.getMedico().getId(), medicoLogado.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Consulta não pertence ao médico logado"));

        var prompt = "Consulta #%d — Sintomas relatados: %s".formatted(consultaId, sintomas);
        return new DadosRespostaIa(chamarApi("claude-opus-4-7", SYSTEM_PRE_DIAGNOSTICO, prompt));
    }

    public DadosRespostaIa gerarLaudo(Long prontuarioId, String anotacoes, Usuario usuarioLogado) {
        var medicoLogado = medicoLogado(usuarioLogado);
        prontuarioRepository.findById(prontuarioId)
                .filter(p -> p.isAtivo() && Objects.equals(p.getMedico().getId(), medicoLogado.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Prontuário não pertence ao médico logado"));

        var prompt = "Prontuário #%d — Anotações do médico: %s".formatted(prontuarioId, anotacoes);
        return new DadosRespostaIa(chamarApi("claude-sonnet-4-6", SYSTEM_LAUDO, prompt));
    }

    public DadosRespostaIa resumirHistorico(Long pacienteId, Usuario usuarioLogado) {
        var medicoLogado = medicoLogado(usuarioLogado);
        var prontuarios = prontuarioRepository.findAllByAtivoTrueAndMedicoIdAndPacienteId(
                medicoLogado.getId(), pacienteId, PageRequest.of(0, 50));

        if (prontuarios.isEmpty()) {
            return new DadosRespostaIa("Nenhum prontuário encontrado para este paciente.");
        }

        var historico = prontuarios.stream()
                .map(p -> "[%s] Diagnóstico: %s | CID-10: %s\nAnamnese: %s\nObservações: %s"
                        .formatted(p.getDataRegistro(), p.getDiagnostico(),
                                p.getCid10(), p.getAnamnese(), p.getObservacoes()))
                .collect(Collectors.joining("\n\n---\n\n"));

        var prompt = "Paciente #%d | Total de prontuários: %d\n\n%s"
                .formatted(pacienteId, prontuarios.getTotalElements(), historico);

        return new DadosRespostaIa(chamarApi("claude-sonnet-4-6", SYSTEM_RESUMO, prompt));
    }

    private Medico medicoLogado(Usuario usuarioLogado) {
        return medicoRepository.findByUsuario(usuarioLogado)
                .filter(Medico::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário médico não está vinculado a um médico ativo"));
    }

    @SuppressWarnings("unchecked")
    private String chamarApi(String model, String systemPrompt, String userMessage) {
        var request = Map.of(
                "model", model,
                "max_tokens", 2048,
                "system", List.of(Map.of(
                        "type", "text",
                        "text", systemPrompt,
                        "cache_control", Map.of("type", "ephemeral")
                )),
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", userMessage
                ))
        );

        var response = restClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(Map.class);

        var content = (List<Map<String, Object>>) response.get("content");
        return (String) content.get(0).get("text");
    }
}
