import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consultasApi } from '@/api/consultas';
import { AuthContext } from '@/contexts/AuthContext';
import type { ConsultaListagem, Page } from '@/types/api';
import { FuncionarioDashboard } from './FuncionarioDashboard';

vi.mock('@/api/consultas', () => ({
  consultasApi: {
    list: vi.fn(),
  },
}));

function consulta(overrides: Partial<ConsultaListagem>): ConsultaListagem {
  return {
    id: 1,
    nomeMedico: 'Dra. Maria Santos',
    nomePaciente: 'João Oliveira',
    dataHora: '2026-08-18T10:30:00',
    prioridade: 'ROTINA',
    tipo: 'NORMAL',
    ...overrides,
  };
}

function page(content: ConsultaListagem[], totalPages = 1, number = 0): Page<ConsultaListagem> {
  return {
    content,
    totalElements: content.length,
    totalPages,
    size: 100,
    number,
  };
}

function mockPages(pages: Array<Page<ConsultaListagem>>) {
  vi.mocked(consultasApi.list).mockImplementation(async (pageNumber = 0) => pages[pageNumber] ?? page([], 1, pageNumber));
}

function renderDashboard() {
  return render(
    <AuthContext.Provider
      value={{
        token: 'token',
        user: { login: 'funcionario@voll.med', role: 'ROLE_FUNCIONARIO' },
        isAuthenticated: true,
        login: async () => undefined,
        logout: () => undefined,
      }}
    >
      <FuncionarioDashboard />
    </AuthContext.Provider>
  );
}

function closestCard(element: HTMLElement) {
  const card = element.closest('[data-slot="card"]');
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

describe('FuncionarioDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 18, 9, 0, 0));
    vi.mocked(consultasApi.list).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exibe estado de carregamento enquanto a agenda inicial está pendente', () => {
    vi.mocked(consultasApi.list).mockReturnValue(new Promise(() => undefined));

    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando agenda de hoje.');
  });

  it('carrega todas as páginas, calcula o resumo do dia e usa somente rotas existentes nas ações rápidas', async () => {
    mockPages([
      page([
        consulta({ id: 1, nomePaciente: 'João Oliveira', dataHora: '2026-08-18T10:30:00' }),
        consulta({ id: 2, nomePaciente: 'Paciente Amanhã', dataHora: '2026-08-19T08:00:00' }),
      ], 2, 0),
      page([
        consulta({ id: 3, nomePaciente: 'Ana Souza', nomeMedico: 'Dr. Carlos Lima', dataHora: '2026-08-18T08:00:00', prioridade: 'PRIORITARIO', tipo: 'RETORNO' }),
      ], 2, 1),
    ]);

    renderDashboard();

    await waitFor(() => expect(consultasApi.list).toHaveBeenCalledTimes(2));
    expect(consultasApi.list).toHaveBeenNthCalledWith(1, 0, 100);
    expect(consultasApi.list).toHaveBeenNthCalledWith(2, 1, 100);

    const consultasCard = closestCard(screen.getByText('Consultas de hoje'));
    expect(within(consultasCard).getByText('2')).toBeInTheDocument();

    const proximaConsultaCard = closestCard(screen.getByText('Próxima consulta'));
    expect(within(proximaConsultaCard).getByText('10:30')).toBeInTheDocument();
    expect(within(proximaConsultaCard).getByText('João Oliveira')).toBeInTheDocument();
    expect(within(proximaConsultaCard).getByText('Médico: Dra. Maria Santos')).toBeInTheDocument();

    const agendaCard = closestCard(screen.getByText('Agenda de hoje'));
    expect(within(agendaCard).getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(within(agendaCard).getAllByText('João Oliveira').length).toBeGreaterThan(0);
    expect(within(agendaCard).queryByText('Paciente Amanhã')).not.toBeInTheDocument();

    expect(screen.queryByText(/Pacientes cadastrados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Médicos ativos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total de consultas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Novo médico/i)).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Nova consulta/i })).toHaveAttribute('href', '/appointments');
    expect(screen.getByRole('link', { name: /Novo paciente/i })).toHaveAttribute('href', '/patients');
    expect(screen.getByRole('link', { name: /Consultar agenda/i })).toHaveAttribute('href', '/appointments');
    expect(screen.getByRole('link', { name: /Localizar prontuário/i })).toHaveAttribute('href', '/medical-records');
  });

  it('filtra a agenda localmente pelo nome do paciente', async () => {
    mockPages([
      page([
        consulta({ id: 1, nomePaciente: 'João Oliveira', dataHora: '2026-08-18T10:30:00' }),
        consulta({ id: 2, nomePaciente: 'Ana Souza', dataHora: '2026-08-18T14:00:00' }),
      ]),
    ]);

    renderDashboard();

    const agendaCard = closestCard(await screen.findByText('Agenda de hoje'));

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar consulta pelo nome do paciente/i }), {
      target: { value: 'Ana' },
    });

    expect(within(agendaCard).getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(within(agendaCard).queryByText('João Oliveira')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar consulta pelo nome do paciente/i }), {
      target: { value: 'Paciente inexistente' },
    });

    expect(screen.getByText('Nenhuma consulta encontrada para essa busca.')).toBeInTheDocument();
  });

  it('exibe estado vazio e ações para agenda sem consultas hoje', async () => {
    mockPages([
      page([
        consulta({ id: 1, nomePaciente: 'Paciente Amanhã', dataHora: '2026-08-19T08:00:00' }),
      ]),
    ]);

    renderDashboard();

    expect(await screen.findByText('Nenhuma consulta agendada para hoje.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Agendar nova consulta/i })).toHaveAttribute('href', '/appointments');
    expect(screen.getByRole('link', { name: /Consultar próximos dias/i })).toHaveAttribute('href', '/appointments');
  });

  it('exibe erro e permite tentar novamente', async () => {
    const user = userEvent.setup();
    vi.mocked(consultasApi.list)
      .mockRejectedValueOnce(new Error('Falha de rede'))
      .mockResolvedValueOnce(page([
        consulta({ id: 1, nomePaciente: 'João Oliveira', dataHora: '2026-08-18T10:30:00' }),
      ]));

    renderDashboard();

    expect(await screen.findByText('Não foi possível carregar a agenda.')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Tentar novamente/i })[0]);

    const consultasCard = closestCard(await screen.findByText('Consultas de hoje'));
    expect(within(consultasCard).getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('João Oliveira').length).toBeGreaterThan(0);
  });

  it('atualiza a agenda ao clicar em atualizar', async () => {
    const user = userEvent.setup();
    vi.mocked(consultasApi.list)
      .mockResolvedValueOnce(page([
        consulta({ id: 1, nomePaciente: 'João Oliveira', dataHora: '2026-08-18T10:30:00' }),
      ]))
      .mockResolvedValueOnce(page([
        consulta({ id: 2, nomePaciente: 'Ana Souza', dataHora: '2026-08-18T11:30:00' }),
      ]));

    renderDashboard();

    expect(await screen.findAllByText('João Oliveira')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Atualizar agenda de hoje/i }));

    expect(await screen.findAllByText('Ana Souza')).not.toHaveLength(0);
    expect(screen.queryByText('João Oliveira')).not.toBeInTheDocument();
  });
});
