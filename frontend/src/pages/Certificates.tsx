import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { atestadosApi } from '@/api/atestados';
import { pacientesApi } from '@/api/pacientes';
import { prontuariosApi } from '@/api/prontuarios';
import { useAuth } from '@/hooks/useAuth';
import { extractApiError } from '@/lib/utils';
import type { AtestadoListagem, PacienteListagem, ProntuarioListagem } from '@/types/api';

export default function Certificates() {
  const { user } = useAuth();
  const isMedico = user?.role === 'ROLE_MEDICO';

  const [patients, setPatients] = useState<PacienteListagem[]>([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [prontuarios, setProntuarios] = useState<ProntuarioListagem[]>([]);
  const [selectedProntuarioId, setSelectedProntuarioId] = useState('');
  const [certs, setCerts] = useState<AtestadoListagem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingProntuarios, setLoadingProntuarios] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [diasAfastamento, setDiasAfastamento] = useState('');
  const [cid10, setCid10] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingPatients(true);
    pacientesApi.list(0, 100)
      .then(r => setPatients(r.content))
      .catch(() => toast.error('Erro ao carregar pacientes'))
      .finally(() => setLoadingPatients(false));
  }, []);

  useEffect(() => {
    setSelectedProntuarioId('');
    setProntuarios([]);
    if (!selectedPacienteId) return;

    setLoadingProntuarios(true);
    prontuariosApi.listByPaciente(Number(selectedPacienteId), 0, 50)
      .then(r => setProntuarios(r.content))
      .catch(() => toast.error('Erro ao carregar prontuários'))
      .finally(() => setLoadingProntuarios(false));
  }, [selectedPacienteId]);

  const fetchAtestados = () => {
    if (!selectedPacienteId) { setCerts([]); return; }
    setLoadingCerts(true);
    atestadosApi.listByPaciente(Number(selectedPacienteId))
      .then(r => setCerts(r.content))
      .catch(() => toast.error('Erro ao carregar atestados'))
      .finally(() => setLoadingCerts(false));
  };

  useEffect(() => {
    fetchAtestados();
  }, [selectedPacienteId]);

  const handleOpenCreate = () => {
    setDiasAfastamento('');
    setCid10('');
    setObservacoes('');
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    const dias = Number(diasAfastamento);
    if (!selectedProntuarioId) { toast.error('Selecione um prontuário'); return; }
    if (!Number.isInteger(dias) || dias < 1) { toast.error('Informe dias de afastamento maior ou igual a 1'); return; }

    setSaving(true);
    try {
      await atestadosApi.create({
        prontuarioId: Number(selectedProntuarioId),
        diasAfastamento: dias,
        cid10: cid10.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      toast.success('Atestado emitido com sucesso');
      setIsCreateOpen(false);
      fetchAtestados();
    } catch (err) {
      toast.error(extractApiError(err, 'Erro ao emitir atestado'));
    } finally {
      setSaving(false);
    }
  };

  const selectedPatient = patients.find(p => String(p.id) === selectedPacienteId);
  const selectedProntuario = prontuarios.find(p => String(p.id) === selectedProntuarioId);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title="Atestados"
          description="Consulte e emita atestados médicos por paciente e prontuário"
          actionLabel={isMedico && selectedProntuarioId ? 'Novo Atestado' : undefined}
          onAction={isMedico && selectedProntuarioId ? handleOpenCreate : undefined}
        />

        <Card className="border-border">
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Paciente</Label>
              <Select value={selectedPacienteId} onValueChange={setSelectedPacienteId} disabled={loadingPatients}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPatients ? 'Carregando...' : 'Selecione um paciente'} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome} - {p.cpf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Prontuário para emissão</Label>
              <Select
                value={selectedProntuarioId}
                onValueChange={setSelectedProntuarioId}
                disabled={!selectedPacienteId || loadingProntuarios}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedPacienteId ? 'Selecione o paciente primeiro'
                    : loadingProntuarios ? 'Carregando...'
                    : prontuarios.length === 0 ? 'Nenhum prontuário encontrado'
                    : 'Selecione o prontuário'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {prontuarios.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      #{p.id} - {p.diagnostico} ({formatDate(p.dataRegistro)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {loadingCerts ? (
          <Card className="border-border p-12 text-center text-muted-foreground">Carregando...</Card>
        ) : selectedPacienteId && certs.length > 0 ? (
          <Card className="border-border overflow-hidden">
            <div className="px-6 py-3 border-b bg-muted/30">
              <p className="text-sm font-medium">Atestados de {selectedPatient?.nome}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data de Emissão</TableHead>
                    <TableHead>Dias de Afastamento</TableHead>
                    <TableHead>Prontuário #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell>#{cert.id}</TableCell>
                      <TableCell>{formatDate(cert.dataEmissao)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{cert.diasAfastamento}</span>
                        <span className="text-muted-foreground text-sm"> dia{cert.diasAfastamento !== 1 ? 's' : ''}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">#{cert.prontuarioId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : selectedPacienteId && !loadingCerts ? (
          <EmptyState
            icon={FileText}
            title="Nenhum atestado encontrado"
            description={`Nenhum atestado registrado para ${selectedPatient?.nome ?? 'este paciente'}.${isMedico && selectedProntuarioId ? ' Use o botão "Novo Atestado" para emitir.' : ''}`}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Selecione um paciente"
            description="Escolha um paciente acima para visualizar seus atestados. Médicos podem selecionar um prontuário para emitir novo atestado."
          />
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Atestado</DialogTitle>
            <DialogDescription>
              Prontuário #{selectedProntuarioId} - {selectedProntuario?.diagnostico}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="diasAfastamento" className="mb-1.5 block">Dias de afastamento *</Label>
              <Input
                id="diasAfastamento"
                type="number"
                min={1}
                value={diasAfastamento}
                onChange={e => setDiasAfastamento(e.target.value)}
                placeholder="Ex: 3"
              />
            </div>

            <div>
              <Label htmlFor="cid10" className="mb-1.5 block">CID-10</Label>
              <Input
                id="cid10"
                value={cid10}
                onChange={e => setCid10(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="observacoes" className="mb-1.5 block">Observações</Label>
              <Textarea
                id="observacoes"
                className="min-h-28"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Emitindo...' : 'Emitir Atestado'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
