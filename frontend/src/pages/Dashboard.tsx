import { useState, useEffect } from 'react';
import { Badge } from '@/components/Badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock, Users, AlertCircle, Plus, Stethoscope, Building2, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { consultasApi } from '@/api/consultas';
import { conveniosApi } from '@/api/convenios';
import { especialidadesApi } from '@/api/especialidades';
import { medicosApi } from '@/api/medicos';
import { pacientesApi } from '@/api/pacientes';
import { prontuariosApi } from '@/api/prontuarios';
import { useAuth } from '@/hooks/useAuth';
import { canReadPatients, canReadConsultas, canWrite } from '@/lib/rbac';
import type { ConsultaListagem, Prioridade } from '@/types/api';

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

interface Stats {
  consultasHoje: number
  totalPacientes: number
  medicoAtivos: number
  totalConsultas: number
  urgenciasHoje: number
  proximasConsultas: number
  totalConvenios: number
  totalEspecialidades: number
  totalProntuarios: number
}

const initialStats: Stats = {
  consultasHoje: 0,
  totalPacientes: 0,
  medicoAtivos: 0,
  totalConsultas: 0,
  urgenciasHoje: 0,
  proximasConsultas: 0,
  totalConvenios: 0,
  totalEspecialidades: 0,
  totalProntuarios: 0,
};

export default function Dashboard() {
  const { user } = useAuth();
  const showPatientStats = canReadPatients(user?.role);
  const showConsultaStats = canReadConsultas(user?.role);
  const isFuncionario = canWrite(user?.role);

  const [stats, setStats] = useState<Stats>(initialStats);
  const [todayAppointments, setTodayAppointments] = useState<ConsultaListagem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showConsultaStats) return;
    setLoading(true);

    const consultasPromise = consultasApi.list(0, 100);
    const pacientesPromise = showPatientStats ? pacientesApi.list(0, 1) : Promise.resolve(null);
    const medicosPromise = isFuncionario ? medicosApi.list(0, 1) : Promise.resolve(null);
    const conveniosPromise = isFuncionario ? conveniosApi.list(0, 1) : Promise.resolve(null);
    const especialidadesPromise = isFuncionario ? especialidadesApi.list(0, 1) : Promise.resolve(null);
    const prontuariosPromise = prontuariosApi.list(0, 1);

    Promise.all([
      consultasPromise,
      pacientesPromise,
      medicosPromise,
      conveniosPromise,
      especialidadesPromise,
      prontuariosPromise,
    ])
      .then(([consultas, pacientes, medicos, convenios, especialidades, prontuarios]) => {
        const hoje = new Date().toDateString();
        const agora = new Date();
        const daquiSeteDias = new Date();
        daquiSeteDias.setDate(daquiSeteDias.getDate() + 7);

        const todayList = consultas.content.filter(
          (c: ConsultaListagem) => new Date(c.dataHora).toDateString() === hoje
        );
        const proximasConsultas = consultas.content.filter(c => {
          const data = new Date(c.dataHora);
          return data >= agora && data <= daquiSeteDias;
        }).length;

        setTodayAppointments(todayList);
        setStats({
          consultasHoje: todayList.length,
          urgenciasHoje: todayList.filter(c => c.prioridade === 'URGENCIA').length,
          proximasConsultas,
          totalPacientes: pacientes?.totalElements ?? 0,
          medicoAtivos: medicos?.totalElements ?? 0,
          totalConsultas: consultas.totalElements,
          totalConvenios: convenios?.totalElements ?? 0,
          totalEspecialidades: especialidades?.totalElements ?? 0,
          totalProntuarios: prontuarios?.totalElements ?? 0,
        });
      })
      .catch(() => setStats(initialStats))
      .finally(() => setLoading(false));
  }, [isFuncionario, showConsultaStats, showPatientStats, user?.role]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const statCards = [
    {
      title: 'Consultas Hoje',
      value: stats.consultasHoje,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      show: showConsultaStats,
    },
    {
      title: 'Urgências Hoje',
      value: stats.urgenciasHoje,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      show: showConsultaStats,
    },
    {
      title: 'Próximos 7 Dias',
      value: stats.proximasConsultas,
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      show: showConsultaStats,
    },
    {
      title: 'Pacientes Cadastrados',
      value: stats.totalPacientes,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      show: showPatientStats,
    },
    {
      title: 'Médicos Ativos',
      value: stats.medicoAtivos,
      icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      show: user?.role !== 'ROLE_MEDICO',
    },
    {
      title: 'Total de Consultas',
      value: stats.totalConsultas,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      show: showConsultaStats,
    },
    {
      title: 'Prontuários',
      value: stats.totalProntuarios,
      icon: BookOpen,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      show: showConsultaStats,
    },
    {
      title: 'Convênios',
      value: stats.totalConvenios,
      icon: Building2,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      show: isFuncionario,
    },
    {
      title: 'Especialidades',
      value: stats.totalEspecialidades,
      icon: Stethoscope,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      show: isFuncionario,
    },
  ].filter(s => s.show);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Bem-vindo ao sistema de gestão clínica Voll.med
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-border animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {isFuncionario && showConsultaStats && (
                <Link href="/appointments">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Consulta
                  </Button>
                </Link>
              )}
              {isFuncionario && showPatientStats && (
                <Link href="/patients">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Paciente
                  </Button>
                </Link>
              )}
              {isFuncionario && (
                <Link href="/doctors">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Médico
                  </Button>
                </Link>
              )}
              {showConsultaStats && (
                <Link href="/medical-records">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Ver Prontuários
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {showConsultaStats && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agenda de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Carregando...</div>
              ) : todayAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayAppointments.map(apt => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-medium">{formatTime(apt.dataHora)}</TableCell>
                          <TableCell>{apt.nomePaciente}</TableCell>
                          <TableCell>{apt.nomeMedico}</TableCell>
                          <TableCell>
                            <Badge variant={prioridadeBadge[apt.prioridade]}>
                              {prioridadeLabel[apt.prioridade]}
                            </Badge>
                          </TableCell>
                          <TableCell>{apt.tipo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma consulta agendada para hoje</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
