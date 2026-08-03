import api from './axios'
import type { IaGerarLaudoPayload, IaPreDiagnosticoPayload, IaResposta } from '@/types/api'

export const iaApi = {
  preDiagnostico: (data: IaPreDiagnosticoPayload) =>
    api.post<IaResposta>('/ia/pre-diagnostico', data).then(r => r.data),

  gerarLaudo: (data: IaGerarLaudoPayload) =>
    api.post<IaResposta>('/ia/gerar-laudo', data).then(r => r.data),

  resumoHistorico: (pacienteId: number) =>
    api.get<IaResposta>(`/ia/resumo-historico/${pacienteId}`).then(r => r.data),
}
