import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
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
import { UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/auth';
import type { CadastroUsuarioRole, MedicoDisponivelVinculoUsuario, UsuarioDetalhamento } from '@/types/auth';

const roleLabels: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_FUNCIONARIO: 'Funcionário',
  ROLE_MEDICO: 'Médico',
  ROLE_AUDITOR: 'Auditor',
  ROLE_GESTOR: 'Gestor',
};

interface FormState {
  login: string
  senha: string
  confirmarSenha: string
  role: CadastroUsuarioRole | ''
  medicoId: string
}

type DoctorLoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const emptyForm = (): FormState => ({ login: '', senha: '', confirmarSenha: '', role: '', medicoId: '' });

export default function Users() {
  const [users, setUsers] = useState<UsuarioDetalhamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [doctors, setDoctors] = useState<MedicoDisponivelVinculoUsuario[]>([]);
  const [doctorLoadState, setDoctorLoadState] = useState<DoctorLoadState>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loginValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.login.trim());
  const senhaValida = formData.senha.length >= 8 && formData.senha.length <= 128;
  const senhasConferem = formData.senha === formData.confirmarSenha;
  const medicoSelecionado = formData.role !== 'ROLE_MEDICO' || (doctorLoadState === 'success' && Boolean(formData.medicoId));
  const formValido = loginValido && senhaValida && senhasConferem && Boolean(formData.role) && medicoSelecionado;
  const medicoSelectDisabled = doctorLoadState === 'loading' || doctorLoadState === 'error' || doctorLoadState === 'empty';

  const fetchUsers = async (p = page) => {
    setLoading(true);
    try {
      const result = await authApi.listUsers(p);
      setUsers(result.content);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchDoctors = async () => {
    setDoctorLoadState('loading');
    setFormData(p => ({ ...p, medicoId: '' }));
    try {
      const result = await authApi.listMedicosDisponiveis(0, 100);
      setDoctors(result.content);
      setDoctorLoadState(result.content.length > 0 ? 'success' : 'empty');
    } catch {
      setDoctors([]);
      setDoctorLoadState('error');
    }
  };

  useEffect(() => {
    if (formData.role === 'ROLE_MEDICO' && doctorLoadState === 'idle') {
      fetchDoctors();
    }
    if (formData.role !== 'ROLE_MEDICO' && formData.medicoId) {
      setFormData(p => ({ ...p, medicoId: '' }));
    }
  }, [formData.role, doctorLoadState, formData.medicoId]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm());
  };

  const getApiMessage = (err: unknown, fallback: string) => {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (typeof data === 'string') return data;
    if (Array.isArray(data) && typeof data[0]?.mensagem === 'string') return data[0].mensagem;
    if (data && typeof data === 'object' && 'mensagem' in data && typeof data.mensagem === 'string') return data.mensagem;
    return fallback;
  };

  const handleSave = async () => {
    if (!formData.login.trim() || !formData.senha || !formData.role) {
      toast.error('Preencha login, senha e perfil');
      return;
    }
    if (!loginValido) {
      toast.error('Informe um e-mail válido para o login');
      return;
    }
    if (!senhaValida) {
      toast.error('A senha deve ter entre 8 e 128 caracteres');
      return;
    }
    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (formData.role === 'ROLE_MEDICO' && !formData.medicoId) {
      toast.error('Selecione o médico vinculado ao usuário');
      return;
    }
    setSaving(true);
    try {
      const medicoId = formData.role === 'ROLE_MEDICO' ? Number(formData.medicoId) : undefined;
      await authApi.cadastrarUsuario({
        login: formData.login.trim(),
        senha: formData.senha,
        role: formData.role as CadastroUsuarioRole,
        ...(medicoId && { medicoId }),
      });
      toast.success('Usuário cadastrado com sucesso');
      if (medicoId) {
        setDoctors([]);
        setDoctorLoadState('idle');
      }
      handleCloseModal();
      if (page === 0) {
        fetchUsers(0);
      } else {
        setPage(0);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(getApiMessage(err, 'Login já cadastrado ou médico indisponível para vínculo'));
      } else if (status === 403) {
        toast.error(getApiMessage(err, 'Você não tem permissão para cadastrar usuários'));
      } else {
        toast.error(getApiMessage(err, 'Erro ao cadastrar usuário'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={UserCog}
          title="Usuários"
          description="Gerencie os usuários do sistema e seus perfis de acesso"
          actionLabel="Novo usuário"
          onAction={() => { setFormData(emptyForm()); setIsModalOpen(true); }}
        />

        {loading ? (
          <Card className="border-border p-12 text-center text-muted-foreground">
            Carregando...
          </Card>
        ) : users.length > 0 ? (
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Login</TableHead>
                    <TableHead>Perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.login}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Próxima<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <EmptyState
            icon={UserCog}
            title="Nenhum usuário cadastrado"
            description="Cadastre o primeiro usuário para dar acesso ao sistema."
            actionLabel="Novo usuário"
            onAction={() => { setFormData(emptyForm()); setIsModalOpen(true); }}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados de acesso do novo usuário</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 block" htmlFor="login">Login (e-mail) *</Label>
              <Input
                id="login"
                type="email"
                value={formData.login}
                onChange={e => setFormData(p => ({ ...p, login: e.target.value }))}
                placeholder="usuario@vollmed.com"
              />
            </div>
            <div>
              <Label className="mb-1.5 block" htmlFor="senha">Senha * (mín. 8 caracteres)</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={e => setFormData(p => ({ ...p, senha: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="mb-1.5 block" htmlFor="confirmarSenha">Confirmar senha *</Label>
              <Input
                id="confirmarSenha"
                type="password"
                value={formData.confirmarSenha}
                onChange={e => setFormData(p => ({ ...p, confirmarSenha: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="mb-1.5 block" htmlFor="role">Perfil *</Label>
                <Select
                  value={formData.role}
                  onValueChange={v => {
                    setFormData(p => ({ ...p, role: v as CadastroUsuarioRole, medicoId: '' }));
                    if (v === 'ROLE_MEDICO') setDoctorLoadState('idle');
                  }}
                >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'ROLE_MEDICO' && (
              <div>
                <Label className="mb-1.5 block" htmlFor="medicoId">Médico vinculado * (deve estar cadastrado primeiro)</Label>
                <Select
                  value={formData.medicoId}
                  disabled={medicoSelectDisabled}
                  onValueChange={v => {
                    setFormData(p => ({ ...p, medicoId: v }));
                  }}
                >
                  <SelectTrigger id="medicoId" className="w-full">
                    <SelectValue placeholder={doctorLoadState === 'loading' ? 'Carregando médicos...' : 'Selecione o médico'} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nome} (CRM {d.crm})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {doctorLoadState === 'loading' && (
                  <p className="text-xs text-muted-foreground mt-2">Carregando médicos disponíveis...</p>
                )}
                {doctorLoadState === 'empty' && (
                  <p className="text-xs text-muted-foreground mt-2">Nenhum médico disponível para vínculo.</p>
                )}
                {doctorLoadState === 'error' && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <span>Erro ao carregar médicos disponíveis.</span>
                    <Button type="button" variant="outline" size="sm" onClick={fetchDoctors}>
                      Tentar novamente
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  O médico precisa estar cadastrado em "Médicos" antes de vincular.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={handleCloseModal} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !formValido}>
                {saving ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
