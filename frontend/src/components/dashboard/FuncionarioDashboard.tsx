import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Calendar,
  Clock,
  FileSearch,
  ListChecks,
  Plus,
  RefreshCw,
  SearchX,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { consultasApi } from '@/api/consultas';
import type { ConsultaListagem, Prioridade, TipoConsulta } from '@/types/api';

const DASHBOARD_PAGE_SIZE = 100;

const prioridadeLabel: Record<Prioridade, string> = {
  ROTINA: 'Rotina',
  PRIORITARIO: 'Prioritário',
  URGENCIA: 'Urgência',
};

const prioridadeBadge: Record<Prioridade, 'success' | 'warning' | 'error'> = {
  ROTINA: 'success',
  PRIORITARIO: 'warning',
  URGENCIA: 'error',
};

const tipoConsultaLabel: Record<TipoConsulta, string> = {
  NORMAL: 'Normal',
  RETORNO: 'Retorno',
};

const quickActions: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: 'Nova consulta', href: '/appointments', icon: Plus },
  { label: 'Novo paciente', href: '/patients', icon: UserPlus },
  { label: 'Consultar agenda', href: '/appointments', icon: Calendar },
  { label: 'Localizar prontuário', href: '/medical-records', icon: FileSearch },
];

async function fetchAllActiveAppointments() {
  const firstPage = await consultasApi.list(0, DASHBOARD_PAGE_SIZE);

  if (firstPage.totalPages <= 1) {
    return firstPage.content;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      consultasApi.list(index + 1, DASHBOARD_PAGE_SIZE)
    )
  );

  return [firstPage.content, ...remainingPages.map(page => page.content)].flat();
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function isSameLocalDay(value: string, reference: Date) {
  const date = new Date(value);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function sortByDateTime(a: ConsultaListagem, b: ConsultaListagem) {
  return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      {[1, 2].map(item => (
        <Card key={item} className="border-border">
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div aria-live="polite" role="status" className="space-y-4">
      <span className="sr-only">Carregando agenda de hoje.</span>
      {[1, 2, 3].map(item => (
        <div key={item} className="rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({ onRetry, disabled }: { onRetry: () => void; disabled?: boolean }) {
  return (
    <Card role="alert" className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Não foi possível carregar a agenda.</p>
            <p className="text-sm text-muted-foreground">
              Verifique sua conexão e tente atualizar os dados novamente.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onRetry} disabled={disabled}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

function AppointmentAction() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/appointments">Abrir na agenda</Link>
    </Button>
  );
}

function AgendaList({ appointments }: { appointments: ConsultaListagem[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {appointments.map(appointment => (
          <article key={appointment.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary">{formatTime(appointment.dataHora)}</p>
                <h3 className="mt-1 font-semibold text-foreground">{appointment.nomePaciente}</h3>
              </div>
              <Badge variant={prioridadeBadge[appointment.prioridade]}>
                {prioridadeLabel[appointment.prioridade]}
              </Badge>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Médico</dt>
                <dd className="font-medium text-foreground">{appointment.nomeMedico}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium text-foreground">{tipoConsultaLabel[appointment.tipo]}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <AppointmentAction />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horário</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Médico</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map(appointment => (
              <TableRow key={appointment.id}>
                <TableCell className="font-medium">{formatTime(appointment.dataHora)}</TableCell>
                <TableCell>{appointment.nomePaciente}</TableCell>
                <TableCell>{appointment.nomeMedico}</TableCell>
                <TableCell>
                  <Badge variant={prioridadeBadge[appointment.prioridade]}>
                    {prioridadeLabel[appointment.prioridade]}
                  </Badge>
                </TableCell>
                <TableCell>{tipoConsultaLabel[appointment.tipo]}</TableCell>
                <TableCell>
                  <AppointmentAction />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function FuncionarioDashboard() {
  const [appointments, setAppointments] = useState<ConsultaListagem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInitialAgenda() {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchAllActiveAppointments();
        if (!active) return;
        setAppointments(data);
      } catch {
        if (!active) return;
        setError(true);
        setAppointments([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialAgenda();

    return () => {
      active = false;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(false);

    try {
      const data = await fetchAllActiveAppointments();
      setAppointments(data);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }

  const now = new Date();
  const todayAppointments = appointments
    .filter(appointment => isSameLocalDay(appointment.dataHora, now))
    .sort(sortByDateTime);
  const nextAppointment = todayAppointments.find(appointment => new Date(appointment.dataHora) >= now);
  const normalizedSearch = normalizeText(search);
  const filteredAppointments = normalizedSearch
    ? todayAppointments.filter(appointment => normalizeText(appointment.nomePaciente).includes(normalizedSearch))
    : todayAppointments;
  const dataUnavailable = error && appointments.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
          <p className="max-w-2xl text-muted-foreground">
            Confira a agenda da clínica para hoje.
          </p>
        </header>

        {error && <ErrorMessage onRetry={handleRefresh} disabled={refreshing} />}

        <section aria-labelledby="resumo-dia" className="space-y-4">
          <div>
            <h2 id="resumo-dia" className="text-lg font-semibold text-foreground">Resumo do dia</h2>
            <p className="text-sm text-muted-foreground">
              Indicadores calculados a partir das consultas ativas retornadas por /consultas.
            </p>
          </div>

          {loading ? (
            <SummarySkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Card className="border-border">
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Consultas de hoje</p>
                      <p className="mt-2 text-4xl font-bold text-foreground">
                        {dataUnavailable ? '—' : todayAppointments.length}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {dataUnavailable
                          ? 'Dados indisponíveis no momento.'
                          : 'Consultas ativas encontradas para a data local.'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <Calendar className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Próxima consulta</p>
                      {dataUnavailable ? (
                        <p className="mt-3 text-sm text-muted-foreground">Dados indisponíveis no momento.</p>
                      ) : nextAppointment ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-4xl font-bold text-foreground">{formatTime(nextAppointment.dataHora)}</p>
                          <p className="font-semibold text-foreground">{nextAppointment.nomePaciente}</p>
                          <p className="text-sm text-muted-foreground">Médico: {nextAppointment.nomeMedico}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">Nenhuma consulta pendente</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <Clock className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Button key={action.label} variant="outline" asChild className="h-auto justify-start py-3 text-left">
                    <Link href={action.href}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {action.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="agenda-hoje">
          <Card className="border-border">
            <CardHeader className="gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle id="agenda-hoje" className="flex items-center gap-2 text-xl">
                    <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
                    Agenda de hoje
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A lista usa somente consultas ativas da API. Status, especialidade, faltas e cancelamentos ainda não estão disponíveis neste contrato.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  aria-label="Atualizar agenda de hoje"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Atualizar agenda
                </Button>
              </div>

              <div className="space-y-2">
                <label htmlFor="dashboard-patient-search" className="text-sm font-medium text-foreground">
                  Buscar paciente
                </label>
                <SearchInput
                  id="dashboard-patient-search"
                  ariaLabel="Buscar consulta pelo nome do paciente"
                  placeholder="Buscar por nome do paciente..."
                  value={search}
                  onChange={setSearch}
                />
                <p className="text-xs text-muted-foreground">
                  Filtro por status indisponível: o endpoint atual ainda não informa status de atendimento.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <AgendaSkeleton />
              ) : dataUnavailable ? (
                <div className="space-y-4">
                  <EmptyState
                    icon={AlertCircle}
                    title="Agenda indisponível"
                    description="Não foi possível buscar as consultas de hoje. Tente carregar os dados novamente."
                  />
                  <div className="flex justify-center">
                    <Button type="button" onClick={handleRefresh} disabled={refreshing}>
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="space-y-4">
                  <EmptyState
                    icon={Calendar}
                    title="Nenhuma consulta agendada para hoje."
                    description="Use os atalhos abaixo para criar uma consulta ou verificar a agenda completa nos próximos dias."
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button asChild>
                      <Link href="/appointments">Agendar nova consulta</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/appointments">Consultar próximos dias</Link>
                    </Button>
                  </div>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="Nenhuma consulta encontrada para essa busca."
                  description="Revise o nome do paciente ou limpe o campo para ver toda a agenda de hoje."
                />
              ) : (
                <AgendaList appointments={filteredAppointments} />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
