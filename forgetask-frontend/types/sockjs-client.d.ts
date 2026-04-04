declare module 'sockjs-client' {
  interface SockJSOptions {
    transports?: string[]
    protocols_whitelist?: string[]
    server?: string
    js_path?: string
    ignore_null_origin?: boolean
    websocket?: boolean
    [key: string]: any
  }

  interface SockJS {
    onopen: (() => void) | null
    onmessage: ((e: { data: string }) => void) | null
    onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null
    readyState: number
    send(data: string): void
    close(code?: number, reason?: string): void
  }

  export default class SockJS {
    constructor(url: string, _reserved?: string, options?: SockJSOptions)
    onopen: (() => void) | null
    onmessage: ((e: { data: string }) => void) | null
    onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null
    readyState: number
    send(data: string): void
    close(code?: number, reason?: string): void
  }
}