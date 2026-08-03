alter table auditoria_prontuario
    add column recurso_tipo varchar(30) not null default 'PRONTUARIO',
    add column recurso_id bigint;

update auditoria_prontuario
set recurso_id = prontuario_id
where recurso_id is null;

create index idx_auditoria_recurso_data on auditoria_prontuario (recurso_tipo, recurso_id, data_hora);
