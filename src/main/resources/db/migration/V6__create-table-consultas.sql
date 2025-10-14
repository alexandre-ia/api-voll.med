CREATE TABLE consultas (
    -- Chave Primária (Corrigido para MySQL)
                           id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Chaves Estrangeiras (Relacionamentos)
                           medico_id BIGINT NOT NULL,
                           paciente_id BIGINT NOT NULL,

    -- Dados da Consulta
                           data_hora DATETIME NOT NULL,
                           ativo BOOLEAN NOT NULL,
                           motivo_cancelamento VARCHAR(100),

    -- Constraints de Chave Estrangeira
                           CONSTRAINT fk_consultas_medico_id
                               FOREIGN KEY (medico_id)
                                   REFERENCES medicos (id),

                           CONSTRAINT fk_consultas_paciente_id
                               FOREIGN KEY (paciente_id)
                                   REFERENCES pacientes (id)
);