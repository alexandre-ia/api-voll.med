import { DashboardLayout } from '@/components/DashboardLayout';
import { FuncionarioDashboard } from '@/components/dashboard/FuncionarioDashboard';
import { MedicoDashboard } from '@/components/dashboard/MedicoDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'ROLE_FUNCIONARIO') {
    return <FuncionarioDashboard />;
  }

  if (user?.role === 'ROLE_MEDICO') {
    return <MedicoDashboard />;
  }

  return (
    <DashboardLayout>
      <Card className="border-border">
        <CardContent>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Não há um dashboard operacional configurado para este perfil.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
