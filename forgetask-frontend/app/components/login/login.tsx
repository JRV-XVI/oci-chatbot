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
      // TODO: reemplazar con tu authService real
      console.log("Enviando al backend Spring Boot:", values)
      // const token = await authService.login(values)
      // localStorage.setItem("token", token)
      router.push("/")
    } catch {
      setServerError("Credenciales incorrectas. Verifica tu correo y contraseña.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 app-background">
      <div className="w-full max-w-sm">

        {/* ── Logo / Brand ── */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-xl mb-4 p-2"
            style={{ background: "rgba(231,107,54,0.15)", border: "1px solid rgba(231,107,54,0.35)" }}>
            <Image
              src="/CloudForge.svg"
              alt="CloudForge"
              width={64}
              height={64}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight neon-orange">Forgetask</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Inicia sesión en tu espacio de trabajo
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
    </div>
  )
}