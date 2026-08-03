import api from './axios'
import type { Page, AtestadoListagem, AtestadoCadastro, AtestadoDetalhamento } from '@/types/api'

export const atestadosApi = {
  listByPaciente: (pacienteId: number, page = 0, size = 10) =>
    api.get<Page<AtestadoListagem>>(`/atestados/paciente/${pacienteId}`, { params: { page, size } }).then(r => r.data),

  get: (id: number) =>
    api.get<AtestadoDetalhamento>(`/atestados/${id}`).then(r => r.data),

  create: (data: AtestadoCadastro) =>
    api.post<AtestadoDetalhamento>('/atestados', data).then(r => r.data),
}
