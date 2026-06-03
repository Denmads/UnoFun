import type { ClientMessage, ServerMessage } from './types'

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function serializeMessage(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg)
}

export function deserializeClientMessage(raw: string): ClientMessage | null {
  return safeParse<ClientMessage>(raw)
}

export function deserializeServerMessage(raw: string): ServerMessage | null {
  return safeParse<ServerMessage>(raw)
}
