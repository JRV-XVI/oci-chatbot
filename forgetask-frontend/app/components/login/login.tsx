"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import authService, { AuthApiError } from "@/app/services/authService"

// ─── Schema de validación ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ─── Componente Principal ─────────────────────────────────────────────────────
export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    setServerError(null)
    try {
      const response = await authService.login(values)

      localStorage.setItem("token", response.token)
      localStorage.setItem("tokenType", response.tokenType)
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          idUser: response.idUser,
          idProject: response.idProject,
          username: response.username,
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          roles: response.roles,
        })
      )

      router.push("/")
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        setServerError("Credenciales incorrectas. Verifica tu correo y contraseña.")
      } else if (error instanceof Error) {
        setServerError(error.message)
      } else {
        setServerError("No se pudo iniciar sesión. Intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(320px,38%)_1fr]" style={{ background: "#060a12" }}>
      <aside className="relative hidden min-h-screen overflow-hidden lg:flex">
        <Image
          src="/signup-side.jpg"
          alt="Panel de control y colaboracion de equipo"
          fill
          priority
          sizes="(min-width: 1024px) 38vw, 100vw"
          className="object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,9,0.36)_0%,rgba(1,4,9,0.65)_48%,rgba(1,4,9,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(231,107,54,0.25),transparent_34%),radial-gradient(circle_at_84%_14%,rgba(231,107,54,0.12),transparent_30%)]" />

        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-8 xl:p-10">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center rounded-xl p-2"
              style={{ background: "rgba(231,107,54,0.15)", border: "1px solid rgba(231,107,54,0.35)" }}
            >
              <Image src="/CloudForge.svg" alt="CloudForge" width={52} height={52} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#ffb28f" }}>
                Forgetask
              </p>
              <p className="text-sm" style={{ color: "rgba(230,237,243,0.85)" }}>
                Project Workspace
              </p>
            </div>
          </div>

          <div className="max-w-sm rounded-[28px] border border-white/10 bg-black/25 p-6 backdrop-blur-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#ffb28f" }}>
              Bienvenido de nuevo
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Retoma el control de tus proyectos.
            </h2>
            <p className="mt-4 text-sm leading-6" style={{ color: "rgba(230,237,243,0.72)" }}>
              Accede a tus tableros, revisa avances del sprint y continua donde lo dejaste.
            </p>
          </div>
        </div>
      </aside>

      <section className="app-background relative flex min-h-screen flex-col justify-start px-4 py-8 sm:px-6 lg:justify-center lg:px-10 xl:px-16">
        <div className="mx-auto w-full max-w-[420px]">
          {/* ── Logo / Brand (solo móvil) ── */}
          <div className="mb-7 text-center lg:hidden">
            <div
              className="inline-flex items-center justify-center rounded-xl p-2"
              style={{ background: "rgba(231,107,54,0.15)", border: "1px solid rgba(231,107,54,0.35)" }}
            >
              <Image src="/CloudForge.svg" alt="CloudForge" width={56} height={56} priority />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight neon-orange">Forgetask</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              Inicia sesion en tu espacio de trabajo
            </p>
          </div>

          {/* ── Encabezado (desktop) ── */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#e6edf3" }}>
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Retoma el control de tus proyectos.
            </p>
          </div>

          {/* ── Card ── */}
          <div
            className="rounded-xl p-6 backdrop-blur-sm"
            style={{
              background: "rgba(13, 17, 23, 0.85)",
              border: "1px solid #2b3542",
              boxShadow: "0 0 0 1px rgba(231,107,54,0.04), 0 24px 48px rgba(0,0,0,0.55)",
            }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Error del servidor */}
            {serverError && (
              <div className="kpi-error-box rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </div>
            )}

            {/* ── Email ── */}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: "#e6edf3", fontSize: "0.875rem", fontWeight: 500 }}>
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
                style={errors.email ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
              />
              {errors.email && (
                <p className="text-xs" style={{ color: "#f87171" }}>{errors.email.message}</p>
              )}
            </div>

            {/* ── Contraseña ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" style={{ color: "#e6edf3", fontSize: "0.875rem", fontWeight: 500 }}>
                  Contraseña
                </Label>
                <a
                  href="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: "var(--forge-orange)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ff8a58")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--forge-orange)")}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Input con botón de mostrar/ocultar */}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                  style={errors.password ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword
                    ? <EyeOff size={16} />
                    : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs" style={{ color: "#f87171" }}>{errors.password.message}</p>
              )}
            </div>

            {/* ── Botón Submit ── */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 font-semibold text-white transition-all"
              style={{
                background: isLoading ? "rgba(231,107,54,0.5)" : "var(--forge-orange)",
                boxShadow: isLoading ? "none" : "0 0 14px rgba(231,107,54,0.35)",
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Iniciando sesión...
                </span>
              ) : "Iniciar sesión"}
            </Button>
            </form>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-sm mt-5" style={{ color: "var(--muted-foreground)" }}>
            ¿No tienes cuenta?{" "}
            <a
              href="/signup"
              className="font-medium transition-colors"
              style={{ color: "var(--forge-orange)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ff8a58")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--forge-orange)")}
            >
              Regístrate gratis
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}