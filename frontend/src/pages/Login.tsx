import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Stethoscope, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clearInvalidStoredAuthSession } from '@/lib/authSession'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AxiosError } from 'axios'

const schema = z.object({
  login: z.string().min(1, 'Informe o login'),
  senha: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { login } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    clearInvalidStoredAuthSession()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setAuthError(null)
    try {
      await login(data.login, data.senha)
      window.location.href = '/'
    } catch (err) {
      const status = (err as AxiosError)?.response?.status
      if (status === 401 || status === 403) {
        setAuthError('Credenciais inválidas. Verifique seu login e senha.')
      } else if (status === 429) {
        setAuthError('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.')
      } else {
        setAuthError('Erro ao conectar com o servidor.')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-card px-14 py-16 border-r border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Stethoscope size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Voll.med</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-foreground leading-snug mb-4">
            Cuidado clínico<br />
            com mais precisão
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Gerencie consultas, prontuários, prescrições e mais — em um sistema
            pensado para o fluxo real de uma clínica.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            'Prontuário eletrônico com janela de edição segura',
            'Agendamento inteligente com disponibilidade do médico',
            'IA clínica para pré-diagnóstico e laudos',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Stethoscope size={18} className="text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Voll.med</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                placeholder="seu@email.com"
                autoComplete="username"
                {...register('login')}
                className={errors.login ? 'border-destructive' : ''}
              />
              {errors.login && (
                <p className="text-xs text-destructive">{errors.login.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('senha')}
                className={errors.senha ? 'border-destructive' : ''}
              />
              {errors.senha && (
                <p className="text-xs text-destructive">{errors.senha.message}</p>
              )}
            </div>

            {authError && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertCircle size={15} className="text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive leading-relaxed">{authError}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full mt-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
