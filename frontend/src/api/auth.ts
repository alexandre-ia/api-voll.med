import api from './axios'
import type { CadastroUsuarioPayload, LoginPayload, MedicoDisponivelVinculoUsuario, TokenResponse, UsuarioDetalhamento } from '@/types/auth'
import type { Page } from '@/types/api'

export const authApi = {
  login: (dados: LoginPayload) =>
    api.post<TokenResponse>('/auth/login', dados).then((r) => r.data),

  cadastrarUsuario: (dados: CadastroUsuarioPayload) =>
    api.post<UsuarioDetalhamento>('/auth/cadastro', dados).then((r) => r.data),

  listUsers: (page = 0, size = 10) =>
    api.get<Page<UsuarioDetalhamento>>('/auth/usuarios', { params: { page, size } }).then((r) => r.data),

  listMedicosDisponiveis: (page = 0, size = 100) =>
    api.get<Page<MedicoDisponivelVinculoUsuario>>('/auth/medicos-disponiveis', { params: { page, size } }).then((r) => r.data),
}
