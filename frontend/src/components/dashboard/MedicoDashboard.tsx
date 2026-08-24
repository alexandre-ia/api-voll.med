import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AlertCircle, BookOpen, Calendar, Clock, Plus, Users } from 'lucide-react';
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
import { consultasApi } from '@/api/consultas';
import { pacientesApi } from '@/api/pacientes';
import { prontuariosApi } from '@/api/prontuarios';
import type { ConsultaListagem, Prioridade, TipoConsulta } from '@/types/api';

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

interface MedicoStats {
  consultasHoje: number
  totalPacientes: number
  totalConsultas: number
  urgenciasHoje: number
  proximasConsultas: number
  totalProntuarios: number
}

const initialStats: MedicoStats = {
  consultasHoje: 0,
  totalPacientes: 0,
  totalConsultas: 0,
  urgenciasHoje: 0,
  proximasConsultas: 0,
  totalProntuarios: 0,
};

export function MedicoDashboard() {
  const [stats, setStats] = useState<MedicoStats>(initialStats);
  const [todayAppointments, setTodayAppointments] = useState<ConsultaListagem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      consultasApi.list(0, 100),
      pacientesApi.list(0, 1),
      prontuariosApi.list(0, 1),
    ])
      .then(([consultas, pacientes, prontuarios]) => {
        if (!active) return;

        const hoje = new Date().toDateString();
        const agora = new Date();
        const daquiSeteDias = new Date();
        daquiSeteDias.setDate(daquiSeteDias.getDate() + 7);

        const todayList = consultas.content.filter(
          (consulta: ConsultaListagem) => new Date(consulta.dataHora).toDateString() === hoje
        );
        const proximasConsultas = consultas.content.filter(consulta => {
          const data = new Date(consulta.dataHora);
          return data >= agora && data <= daquiSeteDias;
        }).length;

        setTodayAppointments(todayList);
        setStats({
          consultasHoje: todayList.length,
          urgenciasHoje: todayList.filter(consulta => consulta.prioridade === 'URGENCIA').length,
          proximasConsultas,
          totalPacientes: pacientes.totalElements,
          totalConsultas: consultas.totalElements,
          totalProntuarios: prontuarios.totalElements,
        });
      })
      .catch(() => {
        if (!active) return;
        setStats(initialStats);
        setTodayAppointments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const statCards = [
    {
      title: 'Consultas Hoje',
      value: stats.consultasHoje,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Urgências Hoje',
      value: stats.urgenciasHoje,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Próximos 7 Dias',
      value: stats.proximasConsultas,
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Pacientes Cadastrados',
      value: stats.totalPacientes,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total de Consultas',
      value: stats.totalConsultas,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Prontuários',
      value: stats.totalProntuarios,
      icon: BookOpen,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

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
            {[1, 2, 3, 4].map(item => (
              <Card key={item} className="border-border animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 rounded bg-muted" />
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
                        <Icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
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
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/medical-records">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Ver Prontuários
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
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
                    {todayAppointments.map(appointment => (
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
      </div>
    </DashboardLayout>
  );
}
