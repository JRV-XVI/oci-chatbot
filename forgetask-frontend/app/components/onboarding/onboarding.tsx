"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { getApiBaseUrl } from "@/app/services/apiBaseUrl"

// Schema de validación Zod
const onboardingSchema = z.object({
  title: z.string().min(3, "El nombre del proyecto es muy corto"),
  description: z.string().optional(),
  budget: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  estimatedTime: z.string().optional(),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

function openNativeDateTimePicker(input: HTMLInputElement) {
  const inputWithPicker = input as HTMLInputElement & {
    showPicker?: () => void
  }

  if (typeof inputWithPicker.showPicker === "function") {
    inputWithPicker.showPicker()
    return
  }

  input.focus()
}

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      title: "",
      description: "",
      budget: "",
      startDate: "",
      endDate: "",
      estimatedTime: "",
    },
  })

  // Avanzar al siguiente paso validando primero
  const handleNextStep = async () => {
    const isStep1Valid = await trigger(["title"]); // Solo valida title en el paso 1
    if (isStep1Valid) {
      setStep(2);
    }
  }

  // Guardar proyecto
  async function onSubmit(values: OnboardingFormValues) {
    setIsLoading(true)
    setServerError(null)

    try {
      const token = localStorage.getItem("token")
      const userStr = localStorage.getItem("auth_user")
      
      if (!token || !userStr) {
        throw new Error("No se encontró la sesión. Inicia sesión nuevamente.")
      }

      const user = JSON.parse(userStr)
      const projectId = user.idProject // Obtenemos el ID del proyecto que se creó en blanco en el signup

      const response = await fetch(`${getApiBaseUrl()}/api/projects/onboarding/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          budget: values.budget ? parseFloat(values.budget) : null,
          startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
          endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
          estimatedTime: values.estimatedTime ? parseFloat(values.estimatedTime) : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al configurar el proyecto")
      }

      // ¡Todo listo! Redirigir al dashboard principal
      router.push("/")
      
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message)
      } else {
        setServerError("Ocurrió un error inesperado")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Función para saltar el onboarding e ir directo a la app (deja el proyecto temporal)
  const skipOnboarding = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Configura tu nuevo proyecto</h1>
          <p className="text-[var(--muted-foreground)]">
            Paso {step} de 2
          </p>
          <div className="flex gap-2 mt-4 w-48 mx-auto">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[var(--forge-orange)]" : "bg-[var(--muted)]"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-[var(--forge-orange)]" : "bg-[var(--muted)]"}`} />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-lg">
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md mb-6 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* --- PASO 1: Datos Básicos --- */}
            <div className={step === 1 ? "block space-y-4" : "hidden"}>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Nombre del Proyecto <span className="text-red-400">*</span></Label>
                <Input
                  id="title"
                  placeholder="Ej. Rediseño Web 2026"
                  className="bg-[var(--surface-offset)] border-[var(--border)] text-white focus:border-[var(--forge-orange)]"
                  {...register("title")}
                />
                {errors.title && <p className="text-sm text-red-400">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Descripción <span className="text-gray-500 font-normal">(opcional)</span></Label>
                <textarea
                  id="description"
                  placeholder="¿De qué trata este proyecto?"
                  className="w-full min-h-[100px] p-3 bg-[var(--surface-offset)] border border-[var(--border)] rounded-md text-white text-sm focus:outline-none focus:border-[var(--forge-orange)] focus:ring-1 focus:ring-[var(--forge-orange)]"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-white">Presupuesto Estimado ($) <span className="text-gray-500 font-normal">(opcional)</span></Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Ej. 5000"
                  className="bg-[var(--surface-offset)] border-[var(--border)] text-white focus:border-[var(--forge-orange)]"
                  {...register("budget")}
                />
              </div>

              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-white text-black hover:bg-gray-200 mt-6 font-medium text-base h-11"
              >
                Siguiente paso <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* --- PASO 2: Tiempos --- */}
            <div className={step === 2 ? "block space-y-4" : "hidden"}>
              <p className="text-xs text-[var(--muted-foreground)]">
                Haz clic en cualquier parte del campo para abrir el calendario.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-white">Fecha de inicio <span className="text-gray-500 font-normal">(opcional)</span></Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    className="cursor-pointer bg-[var(--surface-offset)] border-[var(--border)] text-white focus:border-[var(--forge-orange)] [color-scheme:dark]"
                    onClick={(event) => openNativeDateTimePicker(event.currentTarget)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openNativeDateTimePicker(event.currentTarget)
                      }
                    }}
                    {...register("startDate")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-white">Fecha de fin <span className="text-gray-500 font-normal">(opcional)</span></Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    className="cursor-pointer bg-[var(--surface-offset)] border-[var(--border)] text-white focus:border-[var(--forge-orange)] [color-scheme:dark]"
                    onClick={(event) => openNativeDateTimePicker(event.currentTarget)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openNativeDateTimePicker(event.currentTarget)
                      }
                    }}
                    {...register("endDate")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedTime" className="text-white">Horas Estimadas <span className="text-gray-500 font-normal">(opcional)</span></Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  placeholder="Ej. 120"
                  className="bg-[var(--surface-offset)] border-[var(--border)] text-white focus:border-[var(--forge-orange)]"
                  {...register("estimatedTime")}
                />
              </div>

              <div className="flex gap-3 mt-6 pt-4">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-[var(--border)] text-white hover:bg-[var(--surface-offset)] h-11"
                >
                  Atrás
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-[var(--forge-orange)] text-white hover:bg-[#ff8a58] h-11"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Ir a mi Tablero</>
                  )}
                </Button>
              </div>
            </div>

          </form>
        </div>

        {/* Botón de saltar */}
        <div className="mt-8 text-center">
          <button 
            onClick={skipOnboarding}
            className="text-[var(--muted-foreground)] hover:text-white text-sm transition-colors"
          >
            Saltar por ahora *(proyecto temporal sin configurar)
          </button>
        </div>

      </div>
    </div>
  )
}

export default OnboardingForm