import { useState } from 'react';
import { BrainCircuit, FileSearch, FileText, History, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { iaApi } from '@/api/ia';
import { extractApiError } from '@/lib/utils';

type ResultadoIa = {
  titulo: string
  texto: string
}

export default function ClinicalAI() {
  const [consultaId, setConsultaId] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [prontuarioId, setProntuarioId] = useState('');
  const [anotacoes, setAnotacoes] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [resultado, setResultado] = useState<ResultadoIa | null>(null);
  const [loading, setLoading] = useState<'pre' | 'laudo' | 'resumo' | null>(null);

  const validarId = (valor: string, campo: string) => {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
      toast.error(`Informe um ${campo} válido`);
      return null;
    }
    return id;
  };

  const gerarPreDiagnostico = async () => {
    const id = validarId(consultaId, 'ID de consulta');
    if (!id) return;
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
    const id = validarId(prontuarioId, 'ID de prontuário');
    if (!id) return;
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
    const id = validarId(pacienteId, 'ID de paciente');
    if (!id) return;

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
                <Label htmlFor="consultaId">Consulta ID</Label>
                <Input id="consultaId" value={consultaId} onChange={e => setConsultaId(e.target.value)} inputMode="numeric" />
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
                <Label htmlFor="prontuarioId">Prontuário ID</Label>
                <Input id="prontuarioId" value={prontuarioId} onChange={e => setProntuarioId(e.target.value)} inputMode="numeric" />
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
                <Label htmlFor="pacienteId">Paciente ID</Label>
                <Input id="pacienteId" value={pacienteId} onChange={e => setPacienteId(e.target.value)} inputMode="numeric" />
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
