import WebSocket from 'ws'
import type { ClientMessage, ServerMessage } from '../../shared/types'
import { serializeMessage, deserializeServerMessage } from '../../shared/protocol'

export class GameClient {
  private ws: WebSocket | null = null
  private onMessage: ((msg: ServerMessage) => void) | null = null
  private onStatusChange: ((status: string, data?: unknown) => void) | null = null
  private pingInterval: NodeJS.Timeout | null = null

  setMessageHandler(handler: (msg: ServerMessage) => void): void {
    this.onMessage = handler
  }

  setStatusHandler(handler: (status: string, data?: unknown) => void): void {
    this.onStatusChange = handler
  }

  connect(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = address.startsWith('ws://') ? address : `ws://${address}`

      try {
        this.ws = new WebSocket(url)

        const timeout = setTimeout(() => {
          this.ws?.close()
          reject(new Error('Connection timed out'))
        }, 10000)

        this.ws.on('open', () => {
          clearTimeout(timeout)
          this.onStatusChange?.('connected')
          this.startPing()
          resolve()
        })

        this.ws.on('message', (data) => {
          const msg = deserializeServerMessage(data.toString())
          if (msg) {
            this.onMessage?.(msg)
          }
        })

        this.ws.on('close', () => {
          this.cleanup()
          this.onStatusChange?.('disconnected')
        })

        this.ws.on('error', (err) => {
          clearTimeout(timeout)
          this.cleanup()
          this.onStatusChange?.('error', err.message)
          reject(err)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serializeMessage(msg))
    }
  }

  disconnect(): void {
    this.cleanup()
    this.ws?.close()
    this.ws = null
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 15000)
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}
