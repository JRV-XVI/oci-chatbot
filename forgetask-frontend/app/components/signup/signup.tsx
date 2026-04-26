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

// ─── Schema de validación ─────────
const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
      .max(30, "Máximo 30 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo (_)"),
    email: z.string().email("Correo electrónico inválido"),
    first_name: z
      .string()
      .min(2, "Mínimo 2 caracteres")
      .max(50, "Máximo 50 caracteres"),
    last_name: z
      .string()
      .min(2, "Mínimo 2 caracteres")
      .max(50, "Máximo 50 caracteres"),
    phone_number: z
      .string()
      .min(7, "Número de teléfono inválido")
      .max(20, "Máximo 20 caracteres")
      .regex(/^[+\d\s\-()]+$/, "Formato de teléfono inválido")
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  })

type SignupFormValues = z.infer<typeof signupSchema>

// ─── Sub-componente reutilizable para campo con label + error ─────────────────
function Field({
  id,
  label,
  error,
  children,
  optional = false,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} style={{ color: "#e6edf3", fontSize: "0.875rem", fontWeight: 500 }}>
          {label}
        </Label>
        {optional && (
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>(opcional)</span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function SignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      password: "",
      confirm_password: "",
    },
  })

  // Indicador de fuerza de contraseña
  const passwordValue = watch("password", "")
  const passwordStrength = getPasswordStrength(passwordValue)

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true)
    setServerError(null)
    try {
      // TODO: conectar con el endpoint de registro de Spring Boot
      // Ejemplo:
      // const payload = {
      //   username:     values.username,
      //   email:        values.email,
      //   first_name:   values.first_name,
      //   last_name:    values.last_name,
      //   phone_number: values.phone_number || null,
      //   password:     values.password,
      // }
      // await authService.signup(payload)
      // router.push("/login")
      console.log("TODO — enviar al backend Spring Boot:", values)
    } catch {
      // TODO: manejar errores del backend (ej. username/email ya existente)
      setServerError("No se pudo crear la cuenta. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(320px,38%)_1fr]" style={{ background: "#060a12" }}>
      <aside className="relative hidden min-h-screen overflow-hidden lg:flex">
        <Image
          src="/signup-side.jpg"
          alt="Equipo colaborando en un espacio de trabajo"
          fill
          priority
          sizes="(min-width: 1024px) 38vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,9,0.36)_0%,rgba(1,4,9,0.65)_48%,rgba(1,4,9,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(231,107,54,0.28),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(231,107,54,0.12),transparent_28%)]" />

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
              Workflows claros
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Registra a tu equipo en una experiencia mas cuidada.
            </h2>
            <p className="mt-4 text-sm leading-6" style={{ color: "rgba(230,237,243,0.72)" }}>
              Crea tu espacio, organiza sprints, asigna tareas y revisa metricas desde una interfaz consistente.
            </p>
          </div>
        </div>
      </aside>

      <section className="app-background relative flex min-h-screen flex-col justify-start px-4 py-8 sm:px-6 lg:justify-center lg:px-10 xl:px-16">
        <div className="mx-auto w-full max-w-[460px]">
          {/* ── Logo / Brand (solo móvil) ── */}
          <div className="mb-7 text-center lg:hidden">
            <div
              className="inline-flex items-center justify-center rounded-xl p-2"
              style={{ background: "rgba(231,107,54,0.15)", border: "1px solid rgba(231,107,54,0.35)" }}
            >
              <Image src="/CloudForge.svg" alt="CloudForge" width={56} height={56} />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight neon-orange">Forgetask</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              Registrate para crear tu espacio de trabajo
            </p>
          </div>

          {/* ── Encabezado (desktop) ── */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#e6edf3" }}>
              Crear cuenta
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Configura tu equipo y comienza a gestionar proyectos en minutos.
            </p>
          </div>

          {/* ── Card ── */}
          <div
            className="rounded-xl p-6 backdrop-blur-sm"
            style={{
              background: "rgba(13, 17, 23, 0.85)",
              border: "1px solid #2b3542",
              boxShadow:
                "0 0 0 1px rgba(231,107,54,0.04), 0 24px 48px rgba(0,0,0,0.55)",
            }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Error del servidor */}
            {serverError && (
              <div className="kpi-error-box rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </div>
            )}

            {/* ── First Name + Last Name (2 columnas) ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="first_name" label="Nombre" error={errors.first_name?.message}>
                <Input
                  id="first_name"
                  placeholder="Ana"
                  autoComplete="given-name"
                  disabled={isLoading}
                  aria-invalid={!!errors.first_name}
                  {...register("first_name")}
                  style={errors.first_name ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
              </Field>

              <Field id="last_name" label="Apellido" error={errors.last_name?.message}>
                <Input
                  id="last_name"
                  placeholder="García"
                  autoComplete="family-name"
                  disabled={isLoading}
                  aria-invalid={!!errors.last_name}
                  {...register("last_name")}
                  style={errors.last_name ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
              </Field>
            </div>

            {/* ── Username ── */}
            <Field id="username" label="Nombre de usuario" error={errors.username?.message}>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  @
                </span>
                <Input
                  id="username"
                  placeholder="ana_garcia"
                  autoComplete="username"
                  disabled={isLoading}
                  aria-invalid={!!errors.username}
                  className="pl-7"
                  {...register("username")}
                  style={errors.username ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
              </div>
            </Field>

            {/* ── Email ── */}
            <Field id="email" label="Correo electrónico" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="ana@empresa.com"
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
                style={errors.email ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
              />
            </Field>

            {/* ── Phone Number (opcional) ── */}
            <Field
              id="phone_number"
              label="Teléfono"
              error={errors.phone_number?.message}
              optional
            >
              <Input
                id="phone_number"
                type="tel"
                placeholder="+52 55 1234 5678"
                autoComplete="tel"
                disabled={isLoading}
                aria-invalid={!!errors.phone_number}
                {...register("phone_number")}
                style={errors.phone_number ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
              />
            </Field>

            {/* ── Separador visual ── */}
            <div
              className="border-t my-1"
              style={{ borderColor: "#2b3542" }}
            />

            {/* ── Password ── */}
            <Field id="password" label="Contraseña" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                  style={errors.password ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Barra de fuerza de contraseña */}
              {passwordValue.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background:
                            passwordStrength.score >= level
                              ? passwordStrength.color
                              : "#2b3542",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </Field>

            {/* ── Confirmar contraseña ── */}
            <Field
              id="confirm_password"
              label="Confirmar contraseña"
              error={errors.confirm_password?.message}
            >
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.confirm_password}
                  className="pr-10"
                  {...register("confirm_password")}
                  style={errors.confirm_password ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

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
                  Creando cuenta...
                </span>
              ) : (
                "Crear cuenta"
              )}
            </Button>
            </form>
          </div>

          {/* ── Footer ── */}
          <p
            className="text-center text-sm mt-5"
            style={{ color: "var(--muted-foreground)" }}
          >
            ¿Ya tienes cuenta?{" "}
            <a
              href="/login"
              className="font-medium transition-colors"
              style={{ color: "var(--forge-orange)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ff8a58")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--forge-orange)")}
            >
              Inicia sesión
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}

// ─── Helper: calcula fuerza de la contraseña ──────────────────────────────────
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const levels = [
    { score: 1, label: "Muy débil",  color: "#ef4444" },
    { score: 2, label: "Débil",      color: "#f97316" },
    { score: 3, label: "Aceptable",  color: "#eab308" },
    { score: 4, label: "Fuerte",     color: "#22c55e" },
  ]

  return levels[score - 1] ?? { score: 0, label: "", color: "#2b3542" }
}
