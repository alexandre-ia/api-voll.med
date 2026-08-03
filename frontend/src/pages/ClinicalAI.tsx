import { useEffect, useState } from 'react';
import { BrainCircuit, FileSearch, FileText, History, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { consultasApi } from '@/api/consultas';
import { iaApi } from '@/api/ia';
import { pacientesApi } from '@/api/pacientes';
import { prontuariosApi } from '@/api/prontuarios';
import { extractApiError } from '@/lib/utils';
import type { ConsultaListagem, PacienteListagem, ProntuarioListagem } from '@/types/api';

type ResultadoIa = {
  titulo: string
  texto: string
}

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

export default function ClinicalAI() {
  const [consultas, setConsultas] = useState<ConsultaListagem[]>([]);
  const [prontuarios, setProntuarios] = useState<ProntuarioListagem[]>([]);
  const [pacientes, setPacientes] = useState<PacienteListagem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [consultaId, setConsultaId] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [prontuarioId, setProntuarioId] = useState('');
  const [anotacoes, setAnotacoes] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [resultado, setResultado] = useState<ResultadoIa | null>(null);
  const [loading, setLoading] = useState<'pre' | 'laudo' | 'resumo' | null>(null);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      consultasApi.list(0, 100),
      prontuariosApi.list(0, 100),
      pacientesApi.list(0, 200),
    ])
      .then(([consultasPage, prontuariosPage, pacientesPage]) => {
        setConsultas(consultasPage.content);
        setProntuarios(prontuariosPage.content);
        setPacientes(pacientesPage.content);
      })
      .catch(() => toast.error('Erro ao carregar opções clínicas'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const gerarPreDiagnostico = async () => {
    const id = Number(consultaId);
    if (!id) { toast.error('Selecione uma consulta'); return; }
    if (!sintomas.trim()) { toast.error('Descreva os sintomas do paciente'); return; }

    setLoading('pre');
    try {
      const resposta = await iaApi.preDiagnostico({ consultaId: id, sintomas });
      setResultado({ titulo: `Pré-diagnóstico da consulta #${id}`, texto: resposta.resposta });
    } catch (err) {
      toast.error(extractApiError(err, 'Erro ao gerar pré-diagnóstico'));
    } finally {
      setLoading(null);
    }
  };

  const gerarLaudo = async () => {
    const id = Number(prontuarioId);
    if (!id) { toast.error('Selecione um prontuário'); return; }
    if (!anotacoes.trim()) { toast.error('Informe as anotações clínicas'); return; }

    setLoading('laudo');
    try {
      const resposta = await iaApi.gerarLaudo({ prontuarioId: id, anotacoes });
      setResultado({ titulo: `Laudo do prontuário #${id}`, texto: resposta.resposta });
    } catch (err) {
      toast.error(extractApiError(err, 'Erro ao gerar laudo'));
    } finally {
      setLoading(null);
    }
  };

  const resumirHistorico = async () => {
    const id = Number(pacienteId);
    if (!id) { toast.error('Selecione um paciente'); return; }

    setLoading('resumo');
    try {
      const resposta = await iaApi.resumoHistorico(id);
      setResultado({ titulo: `Resumo histórico do paciente #${id}`, texto: resposta.resposta });
    } catch (err) {
      toast.error(extractApiError(err, 'Erro ao resumir histórico'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={BrainCircuit}
          title="IA clínica"
          description="Ferramentas de apoio para médicos: pré-diagnóstico, laudo e resumo histórico"
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="border-border p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><FileSearch className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="font-semibold">Pré-diagnóstico</h2>
                <p className="text-sm text-muted-foreground">Hipóteses e risco a partir dos sintomas</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Consulta</Label>
                <Select value={consultaId} onValueChange={setConsultaId} disabled={loadingOptions}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Carregando consultas...' : 'Selecione a consulta'} />
                  </SelectTrigger>
                  <SelectContent>
                    {consultas.map(consulta => (
                      <SelectItem key={consulta.id} value={String(consulta.id)}>
                        #{consulta.id} - {consulta.nomePaciente} com {consulta.nomeMedico} - {formatDateTime(consulta.dataHora)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sintomas">Sintomas</Label>
                <Textarea id="sintomas" className="min-h-32" value={sintomas} onChange={e => setSintomas(e.target.value)} />
              </div>
              <Button onClick={gerarPreDiagnostico} disabled={loading !== null} className="w-full">
                {loading === 'pre' ? 'Gerando...' : 'Gerar pré-diagnóstico'}
              </Button>
            </div>
          </Card>

          <Card className="border-border p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="font-semibold">Gerar laudo</h2>
                <p className="text-sm text-muted-foreground">Estrutura texto clínico livre</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Prontuário</Label>
                <Select value={prontuarioId} onValueChange={setProntuarioId} disabled={loadingOptions}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Carregando prontuários...' : 'Selecione o prontuário'} />
                  </SelectTrigger>
                  <SelectContent>
                    {prontuarios.map(prontuario => (
                      <SelectItem key={prontuario.id} value={String(prontuario.id)}>
                        #{prontuario.id} - {prontuario.nomePaciente} - {prontuario.diagnostico} ({formatDate(prontuario.dataRegistro)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="anotacoes">Anotações</Label>
                <Textarea id="anotacoes" className="min-h-32" value={anotacoes} onChange={e => setAnotacoes(e.target.value)} />
              </div>
              <Button onClick={gerarLaudo} disabled={loading !== null} className="w-full">
                {loading === 'laudo' ? 'Gerando...' : 'Gerar laudo'}
              </Button>
            </div>
          </Card>

          <Card className="border-border p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><History className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="font-semibold">Resumo histórico</h2>
                <p className="text-sm text-muted-foreground">Síntese dos prontuários acessíveis</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Paciente</Label>
                <Select value={pacienteId} onValueChange={setPacienteId} disabled={loadingOptions}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Carregando pacientes...' : 'Selecione o paciente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map(paciente => (
                      <SelectItem key={paciente.id} value={String(paciente.id)}>
                        {paciente.nome} - {paciente.cpf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                A IA considera apenas dados clínicos que pertencem ao médico logado.
              </div>
              <Button onClick={resumirHistorico} disabled={loading !== null} className="w-full">
                {loading === 'resumo' ? 'Gerando...' : 'Gerar resumo'}
              </Button>
            </div>
          </Card>
        </div>

        <Card className="border-border p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Resultado</h2>
          </div>
          {resultado ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{resultado.titulo}</h3>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-6 text-foreground">
                {resultado.texto}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Escolha uma ferramenta acima para gerar uma resposta da IA clínica.</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
