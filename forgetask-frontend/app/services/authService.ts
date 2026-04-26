import { getApiBaseUrl } from "@/app/services/apiBaseUrl"

const API_BASE_URL = getApiBaseUrl()

export type LoginRequest = {
  email: string
  password: string
}

export type SignupRequest = {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export type LoginResponse = {
  token: string
  tokenType: string
  idUser: number
  username: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export class AuthApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthApiError"
    this.status = status
  }
}

function getErrorMessage(errorBody: unknown): string | null {
  if (!errorBody || typeof errorBody !== "object") {
    return null
  }

  if ("message" in errorBody && typeof errorBody.message === "string") {
    return errorBody.message
  }

  if ("error" in errorBody && typeof errorBody.error === "string") {
    return errorBody.error
  }

  return null
}

class AuthService {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    let response: Response

    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new Error("No se pudo conectar con el servidor. Intenta nuevamente.")
    }

    if (!response.ok) {
      let errorMessage = "No se pudo iniciar sesión. Intenta nuevamente."

      try {
        const errorBody = await response.json()
        errorMessage = getErrorMessage(errorBody) || errorMessage
      } catch {
        // If backend did not return JSON, keep the default message.
      }

      throw new AuthApiError(errorMessage, response.status)
    }

    return await response.json()
  }

  async signup(payload: SignupRequest): Promise<LoginResponse> {
    let response: Response

    try {
      response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new Error("No se pudo conectar con el servidor. Intenta nuevamente.")
    }

    if (!response.ok) {
      let errorMessage = "No se pudo crear la cuenta. Intenta de nuevo."

      try {
        const errorBody = await response.json()
        errorMessage = getErrorMessage(errorBody) || errorMessage
      } catch {
        // If backend did not return JSON, keep the default message.
      }

      throw new AuthApiError(errorMessage, response.status)
    }

    return await response.json()
  }
}

const authService = new AuthService()

export default authService