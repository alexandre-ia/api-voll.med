import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Edit, Trash2, Clock, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { medicosApi } from '@/api/medicos';
import { especialidadesApi } from '@/api/especialidades';
import { disponibilidadeApi } from '@/api/disponibilidade';
import { medicoConveniosApi } from '@/api/medicoConvenios';
import { conveniosApi } from '@/api/convenios';
import { useAuth } from '@/hooks/useAuth';
import { canWrite } from '@/lib/rbac';
import { extractApiError } from '@/lib/utils';
import type {
  MedicoListagem,
  MedicoDetalhamento,
  MedicoCadastro,
  MedicoAtualizacao,
  EspecialidadeListagem,
  EnderecoPayload,
  DisponibilidadeListagem,
  DiaSemana,
  MedicoConvenioListagem,
  ConvenioListagem,
} from '@/types/api';

type FormEndereco = Partial<EnderecoPayload>;

const diasSemanaLabels: Record<DiaSemana, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const diasSemanaOrder: DiaSemana[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

interface FormState {
  nome: string
  email: string
  telefone: string
  crm: string
  especialidadeId: string
  endereco: FormEndereco
}

const emptyForm = (): FormState => ({
  nome: '',
  email: '',
  telefone: '',
  crm: '',
  especialidadeId: '',
  endereco: {},
})

export default function Doctors() {
  const { user } = useAuth();
  const allowWrite = canWrite(user?.role);

  const [doctors, setDoctors] = useState<MedicoListagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');

  const [especialidades, setEspecialidades] = useState<EspecialidadeListagem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Convênios modal
  const [isConveniosOpen, setIsConveniosOpen] = useState(false);
  const [conveniosMedico, setConveniosMedico] = useState<MedicoConvenioListagem[]>([]);
  const [conveniosLoading, setConveniosLoading] = useState(false);
  const [conveniosList, setConveniosList] = useState<ConvenioListagem[]>([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState('');
  const [savingConvenio, setSavingConvenio] = useState(false);

  // Horários modal
  const [isHorariosOpen, setIsHorariosOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<MedicoListagem | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeListagem[]>([]);
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [horarioForm, setHorarioForm] = useState({ diaSemana: '' as DiaSemana | '', horaInicio: '', horaFim: '' });
  const [savingHorario, setSavingHorario] = useState(false);

  const fetchDoctors = async (p = page) => {
    setLoading(true);
    try {
      const result = await medicosApi.list(p);
      setDoctors(result.content);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Erro ao carregar médicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(page);
  }, [page]);

  useEffect(() => {
    if (allowWrite || user?.role !== 'ROLE_ADMIN') {
      especialidadesApi.listAll().then(setEspecialidades).catch(() => {});
    }
  }, []);

  const filteredDoctors = search.trim()
    ? doctors.filter(d =>
        [d.nome, d.crm, d.especialidade, d.email]
          .some(v => v?.toLowerCase().includes(search.toLowerCase()))
      )
    : doctors;

  const handleOpenModal = async (doctor?: MedicoListagem) => {
    if (doctor) {
      try {
        const detail: MedicoDetalhamento = await medicosApi.get(doctor.id);
        setEditingId(doctor.id);
        setFormData({
          nome: detail.nome,
          email: detail.email,
          telefone: detail.telefone,
          crm: detail.crm,
          especialidadeId: String(
            especialidades.find(e => e.nome === detail.especialidade)?.id ?? ''
          ),
          endereco: { ...detail.endereco },
        });
      } catch {
        toast.error('Erro ao carregar dados do médico');
        return;
      }
    } else {
      setEditingId(null);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm());
  };

  const setEndereco = (field: keyof EnderecoPayload, value: string) => {
    setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.email || !formData.crm || !formData.especialidadeId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const crm = formData.crm.replace(/\D/g, '');
    if (!/^\d{4,6}$/.test(crm)) {
      toast.error('CRM deve conter somente 4 a 6 dígitos. Exemplo: 1542 ou 123456. Não use UF no CRM.');
      return;
    }

    const cep = (formData.endereco.cep ?? '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cep)) {
      toast.error('CEP deve conter exatamente 8 dígitos. Exemplo: 74000000.');
      return;
    }

    setSaving(true);
    try {
      const endereco = { ...formData.endereco, cep } as EnderecoPayload;
      if (editingId) {
        const payload: MedicoAtualizacao = {
          id: editingId,
          nome: formData.nome,
          telefone: formData.telefone,
          endereco,
        };
        await medicosApi.update(payload);
        toast.success('Médico atualizado com sucesso');
      } else {
        const payload: MedicoCadastro = {
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          crm,
          especialidadeId: Number(formData.especialidadeId),
          endereco,
        };
        await medicosApi.create(payload);
        toast.success('Médico cadastrado com sucesso');
      }
      handleCloseModal();
      setPage(0);
      fetchDoctors(0);
    } catch (err: any) {
      toast.error(extractApiError(err, 'Erro ao salvar médico'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConvenios = async (doctor: MedicoListagem) => {
    setSelectedDoctor(doctor);
    setSelectedConvenioId('');
    setIsConveniosOpen(true);
    setConveniosLoading(true);
    try {
      const [vinculados, todos] = await Promise.all([
        medicoConveniosApi.list(doctor.id),
        conveniosApi.listAll(),
      ]);
      setConveniosMedico(vinculados);
      setConveniosList(todos);
    } catch {
      toast.error('Erro ao carregar convênios');
    } finally {
      setConveniosLoading(false);
    }
  };

  const handleVincularConvenio = async () => {
    if (!selectedConvenioId || !selectedDoctor) return;
    setSavingConvenio(true);
    try {
      const novo = await medicoConveniosApi.vincular(selectedDoctor.id, { convenioId: Number(selectedConvenioId) });
      setConveniosMedico(prev => [...prev, novo]);
      setSelectedConvenioId('');
      toast.success('Convênio vinculado');
    } catch (err: any) {
      toast.error(extractApiError(err, 'Erro ao vincular convênio'));
    } finally {
      setSavingConvenio(false);
    }
  };

  const handleDesvincularConvenio = async (convenioId: number) => {
    if (!selectedDoctor) return;
    try {
      await medicoConveniosApi.desvincular(selectedDoctor.id, convenioId);
      setConveniosMedico(prev => prev.filter(c => c.convenioId !== convenioId));
      toast.success('Convênio desvinculado');
    } catch {
      toast.error('Erro ao desvincular convênio');
    }
  };

  const handleOpenHorarios = async (doctor: MedicoListagem) => {
    setSelectedDoctor(doctor);
    setHorarioForm({ diaSemana: '', horaInicio: '', horaFim: '' });
    setIsHorariosOpen(true);
    setHorariosLoading(true);
    try {
      const list = await disponibilidadeApi.list(doctor.id);
      setDisponibilidades(list);
    } catch {
      toast.error('Erro ao carregar horários');
    } finally {
      setHorariosLoading(false);
    }
  };

  const handleAddHorario = async () => {
    if (!horarioForm.diaSemana || !horarioForm.horaInicio || !horarioForm.horaFim) {
      toast.error('Preencha dia, hora início e hora fim');
      return;
    }
    if (horarioForm.horaFim <= horarioForm.horaInicio) {
      toast.error('Hora fim deve ser maior que hora início');
      return;
    }
    setSavingHorario(true);
    try {
      const nova = await disponibilidadeApi.create(selectedDoctor!.id, {
        diaSemana: horarioForm.diaSemana,
        horaInicio: horarioForm.horaInicio,
        horaFim: horarioForm.horaFim,
      });
      setDisponibilidades(prev => [...prev, nova]);
      setHorarioForm({ diaSemana: '', horaInicio: '', horaFim: '' });
      toast.success('Horário adicionado');
    } catch (err: any) {
      toast.error(extractApiError(err, 'Erro ao adicionar horário'));
    } finally {
      setSavingHorario(false);
    }
  };

  const handleRemoveHorario = async (disponibilidadeId: number) => {
    try {
      await disponibilidadeApi.remove(selectedDoctor!.id, disponibilidadeId);
      setDisponibilidades(prev => prev.filter(d => d.id !== disponibilidadeId));
      toast.success('Horário removido');
    } catch {
      toast.error('Erro ao remover horário');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await medicosApi.remove(id);
      toast.success('Médico inativado com sucesso');
      fetchDoctors(page);
    } catch {
      toast.error('Erro ao inativar médico');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="Médicos"
          description="Gerencie os médicos cadastrados na clínica"
          actionLabel="Novo médico"
          onAction={allowWrite ? () => handleOpenModal() : undefined}
        />

        <Card className="border-border">
          <div className="p-6">
            <SearchInput
              placeholder="Buscar por nome, CRM, especialidade ou e-mail..."
              value={search}
              onChange={setSearch}
            />
          </div>
        </Card>

        {loading ? (
          <Card className="border-border p-12 text-center text-muted-foreground">
            Carregando...
          </Card>
        ) : filteredDoctors.length > 0 ? (
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>E-mail</TableHead>
                    {allowWrite && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.nome}</TableCell>
                      <TableCell>{doctor.especialidade}</TableCell>
                      <TableCell>{doctor.crm}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doctor.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" title="Gerenciar convênios" onClick={() => handleOpenConvenios(doctor)}>
                            <CreditCard className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Gerenciar horários" onClick={() => handleOpenHorarios(doctor)}>
                            <Clock className="h-4 w-4 text-primary" />
                          </Button>
                          {allowWrite && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(doctor)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(doctor.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum médico encontrado"
            description={search ? 'Nenhum resultado para a busca.' : 'Cadastre o primeiro médico para começar.'}
            actionLabel={allowWrite ? 'Novo médico' : undefined}
            onAction={allowWrite ? () => handleOpenModal() : undefined}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Médico' : 'Novo Médico'}</DialogTitle>
            <DialogDescription>Preencha os dados do médico abaixo</DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold mb-5 text-foreground">Dados Profissionais</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block" htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled={!!editingId}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(62) 99999-0000"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="crm">CRM * (4–6 dígitos)</Label>
                  <Input
                    id="crm"
                    value={formData.crm}
                    disabled={!!editingId}
                    onChange={e => setFormData(p => ({ ...p, crm: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block" htmlFor="especialidade">Especialidade *</Label>
                  <Select
                    value={formData.especialidadeId}
                    onValueChange={v => setFormData(p => ({ ...p, especialidadeId: v }))}
                    disabled={!!editingId}
                  >
                    <SelectTrigger id="especialidade">
                      <SelectValue placeholder="Selecione uma especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {especialidades.map(spec => (
                        <SelectItem key={spec.id} value={String(spec.id)}>
                          {spec.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-5 text-foreground">Endereço</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block" htmlFor="cep">CEP * (8 dígitos)</Label>
                  <Input
                    id="cep"
                    value={formData.endereco.cep ?? ''}
                    onChange={e => setEndereco('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="74000000"
                    maxLength={8}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    value={formData.endereco.uf ?? ''}
                    onChange={e => setEndereco('uf', e.target.value.toUpperCase())}
                    placeholder="GO"
                    maxLength={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block" htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.endereco.cidade ?? ''}
                    onChange={e => setEndereco('cidade', e.target.value)}
                    placeholder="Goiânia"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block" htmlFor="logradouro">Logradouro *</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco.logradouro ?? ''}
                    onChange={e => setEndereco('logradouro', e.target.value)}
                    placeholder="Avenida Goiás"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco.bairro ?? ''}
                    onChange={e => setEndereco('bairro', e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block" htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.endereco.numero ?? ''}
                    onChange={e => setEndereco('numero', e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block" htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco.complemento ?? ''}
                    onChange={e => setEndereco('complemento', e.target.value)}
                    placeholder="Sala 501"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Convênios Modal */}
      <Dialog open={isConveniosOpen} onOpenChange={setIsConveniosOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convênios Aceitos — {selectedDoctor?.nome}</DialogTitle>
            <DialogDescription>Gerencie os planos de saúde aceitos por este médico</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {allowWrite && (
              <div>
                <h3 className="text-sm font-semibold mb-4 text-foreground">Vincular Convênio</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="mb-1.5 block">Convênio</Label>
                    <Select value={selectedConvenioId} onValueChange={setSelectedConvenioId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um convênio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {conveniosList
                          .filter(c => !conveniosMedico.some(v => v.convenioId === c.id))
                          .map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleVincularConvenio} disabled={!selectedConvenioId || savingConvenio}>
                    {savingConvenio ? 'Vinculando...' : 'Vincular'}
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Convênios Vinculados</h3>
              {conveniosLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : conveniosMedico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum convênio vinculado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código ANS</TableHead>
                      <TableHead>Tipo</TableHead>
                      {allowWrite && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conveniosMedico.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nomeConvenio}</TableCell>
                        <TableCell>{c.codigoANS ?? '—'}</TableCell>
                        <TableCell>{c.tipo === 'PARTICULAR' ? 'Particular' : 'Plano'}</TableCell>
                        {allowWrite && (
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDesvincularConvenio(c.convenioId)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setIsConveniosOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Horários Modal */}
      <Dialog open={isHorariosOpen} onOpenChange={setIsHorariosOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Horários de Disponibilidade — {selectedDoctor?.nome}</DialogTitle>
            <DialogDescription>Gerencie os dias e horários em que o médico atende</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Form para adicionar */}
            {allowWrite && (
              <div>
                <h3 className="text-sm font-semibold mb-4 text-foreground">Adicionar Horário</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="mb-1.5 block" htmlFor="diaSemana">Dia da Semana *</Label>
                    <Select
                      value={horarioForm.diaSemana}
                      onValueChange={v => setHorarioForm(p => ({ ...p, diaSemana: v as DiaSemana }))}
                    >
                      <SelectTrigger id="diaSemana">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasSemanaOrder.map(d => (
                          <SelectItem key={d} value={d}>{diasSemanaLabels[d]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block" htmlFor="horaInicio">Hora Início *</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={horarioForm.horaInicio}
                      onChange={e => setHorarioForm(p => ({ ...p, horaInicio: e.target.value }))}
                      min="07:00"
                      max="19:00"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block" htmlFor="horaFim">Hora Fim *</Label>
                    <Input
                      id="horaFim"
                      type="time"
                      value={horarioForm.horaFim}
                      onChange={e => setHorarioForm(p => ({ ...p, horaFim: e.target.value }))}
                      min="07:00"
                      max="19:00"
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleAddHorario} disabled={savingHorario}>
                  {savingHorario ? 'Adicionando...' : 'Adicionar Horário'}
                </Button>
              </div>
            )}

            {/* Lista de horários existentes */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Horários Cadastrados</h3>
              {horariosLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : disponibilidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      {allowWrite && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disponibilidades
                      .slice()
                      .sort((a, b) => diasSemanaOrder.indexOf(a.diaSemana) - diasSemanaOrder.indexOf(b.diaSemana))
                      .map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{diasSemanaLabels[d.diaSemana]}</TableCell>
                          <TableCell>{d.horaInicio.slice(0, 5)}</TableCell>
                          <TableCell>{d.horaFim.slice(0, 5)}</TableCell>
                          {allowWrite && (
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveHorario(d.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setIsHorariosOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
