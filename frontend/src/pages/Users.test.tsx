import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Users from './Users'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    cadastrarUsuario: vi.fn(),
    listUsers: vi.fn(),
    listMedicosDisponiveis: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const authApiMock = vi.mocked(authApi)
const toastMock = vi.mocked(toast)

function page<T>(content: T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    size: 100,
    number: 0,
  }
}

async function renderUsersAndOpenModal() {
  render(<Users />)
  await screen.findByText('Nenhum usuário cadastrado')
  await userEvent.click(screen.getAllByRole('button', { name: /novo usuário/i })[0])
}

async function selecionarPerfil(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: /perfil/i }))
  await userEvent.click(screen.getByRole('option', { name: label }))
}

async function selecionarMedico(label: RegExp) {
  await userEvent.click(screen.getByRole('combobox', { name: /médico vinculado/i }))
  await userEvent.click(await screen.findByRole('option', { name: label }))
}

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApiMock.listUsers.mockResolvedValue(page([]))
    authApiMock.listMedicosDisponiveis.mockResolvedValue(page([]))
    authApiMock.cadastrarUsuario.mockResolvedValue({ id: 1, login: 'novo@test.com', role: 'ROLE_FUNCIONARIO' })
  })

  it('carrega e exibe médicos disponíveis ao selecionar perfil médico', async () => {
    authApiMock.listMedicosDisponiveis.mockResolvedValue(page([
      { id: 10, nome: 'Pedro Paulo Pinto', crm: '1542' },
    ]))

    await renderUsersAndOpenModal()
    await selecionarPerfil('Médico')

    expect(authApiMock.listMedicosDisponiveis).toHaveBeenCalledWith(0, 100)
    await selecionarMedico(/Pedro Paulo Pinto \(CRM 1542\)/)
    expect(screen.getByRole('combobox', { name: /médico vinculado/i })).toHaveTextContent('Pedro Paulo Pinto')
  })

  it('distingue lista vazia de erro ao carregar médicos', async () => {
    authApiMock.listMedicosDisponiveis.mockResolvedValue(page([]))

    await renderUsersAndOpenModal()
    await selecionarPerfil('Médico')

    expect(await screen.findByText('Nenhum médico disponível para vínculo.')).toBeInTheDocument()
    expect(screen.queryByText('Erro ao carregar médicos disponíveis.')).not.toBeInTheDocument()
  })

  it('exibe erro e permite tentar novamente quando a lista de médicos falha', async () => {
    authApiMock.listMedicosDisponiveis
      .mockRejectedValueOnce(new Error('falha'))
      .mockResolvedValueOnce(page([{ id: 11, nome: 'Ana Maria', crm: '9999' }]))

    await renderUsersAndOpenModal()
    await selecionarPerfil('Médico')

    expect(await screen.findByText('Erro ao carregar médicos disponíveis.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    await selecionarMedico(/Ana Maria \(CRM 9999\)/)
    expect(authApiMock.listMedicosDisponiveis).toHaveBeenCalledTimes(2)
  })

  it('mantém cadastrar desabilitado até selecionar médico válido e envia medicoId numérico', async () => {
    authApiMock.listMedicosDisponiveis.mockResolvedValue(page([
      { id: 10, nome: 'Pedro Paulo Pinto', crm: '1542' },
    ]))
    authApiMock.cadastrarUsuario.mockResolvedValue({ id: 2, login: 'medico@test.com', role: 'ROLE_MEDICO' })

    await renderUsersAndOpenModal()

    await userEvent.type(screen.getByLabelText(/login/i), ' medico@test.com ')
    await userEvent.type(screen.getByLabelText(/^senha/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    await selecionarPerfil('Médico')

    const cadastrar = screen.getByRole('button', { name: 'Cadastrar' })
    expect(cadastrar).toBeDisabled()

    await selecionarMedico(/Pedro Paulo Pinto \(CRM 1542\)/)
    expect(cadastrar).toBeEnabled()

    await userEvent.click(cadastrar)

    await waitFor(() => {
      expect(authApiMock.cadastrarUsuario).toHaveBeenCalledWith({
        login: 'medico@test.com',
        senha: 'senha123',
        role: 'ROLE_MEDICO',
        medicoId: 10,
      })
    })
    expect(toastMock.success).toHaveBeenCalledWith('Usuário cadastrado com sucesso')
  })

  it('não envia medicoId para perfil não médico', async () => {
    await renderUsersAndOpenModal()

    await userEvent.type(screen.getByLabelText(/login/i), 'func@test.com')
    await userEvent.type(screen.getByLabelText(/^senha/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    await selecionarPerfil('Funcionário')

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    await waitFor(() => {
      expect(authApiMock.cadastrarUsuario).toHaveBeenCalledWith({
        login: 'func@test.com',
        senha: 'senha123',
        role: 'ROLE_FUNCIONARIO',
      })
    })
  })

  it('exibe perfil ADMIN traduzido na listagem de usuários', async () => {
    authApiMock.listUsers.mockResolvedValue({
      ...page([{ id: 1, login: 'admin@test.com', role: 'ROLE_ADMIN' as const }]),
      size: 10,
    })

    render(<Users />)

    const row = await screen.findByRole('row', { name: /admin@test.com/i })
    expect(within(row).getByText('Administrador')).toBeInTheDocument()
  })
})
