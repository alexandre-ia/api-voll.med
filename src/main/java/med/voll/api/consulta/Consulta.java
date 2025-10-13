package med.voll.api.consulta;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import med.voll.api.medico.Medico;
import med.voll.api.paciente.Paciente;

import java.time.LocalDateTime;

@Table(name = "consultas")
@Entity(name = "Consulta")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Use referências diretas às entidades para integridade e consultas eficientes
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medico_id")
    private Medico medico; // Supondo que você tenha uma classe Medico

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paciente_id")
    private Paciente paciente; // Supondo que você tenha uma classe Paciente

    // Tipo ideal para armazenar data e hora com precisão
    private LocalDateTime dataHora;

    // Atributo para gerenciar o cancelamento da consulta
    private Boolean ativo = true;

    // Atributo para armazenar o motivo do cancelamento
    @Enumerated(EnumType.STRING)
    private MotivoCancelamento motivoCancelamento; // Deve ser uma ENUM


    // NOVO CONSTRUTOR para ser usado no Service.
    // Ele inicializa apenas os campos que vêm do agendamento
    public Consulta(Medico medico, Paciente paciente, LocalDateTime dataHora) {
        this.medico = medico;
        this.paciente = paciente;
        this.dataHora = dataHora;
        this.ativo = true; // Valor padrão
        this.motivoCancelamento = null; // Valor padrão
    }

}
