import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  hostGame: (port: number, name: string, unoMessage: string) => Promise<{ success: boolean; playerId?: string; error?: string }>
  joinGame: (address: string, name: string, unoMessage: string) => Promise<{ success: boolean; error?: string }>
  disconnect: () => Promise<void>
  sendMessage: (message: string) => Promise<void>
  onMessage: (callback: (message: string) => void) => () => void
  onConnectionChange: (callback: (status: string, data?: unknown) => void) => () => void
  getNetworkAddresses: () => Promise<string[]>
}

function subscribe<T extends unknown[]>(
  channel: string,
  callback: (...args: T) => void
): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
    callback(...(args as T))
  }
  ipcRenderer.on(channel, handler)
  return () => { ipcRenderer.removeListener(channel, handler) }
}

const api: ElectronAPI = {
  hostGame: (port: number, name: string, unoMessage: string) =>
    ipcRenderer.invoke('network:host', port, name, unoMessage),
  joinGame: (address: string, name: string, unoMessage: string) =>
    ipcRenderer.invoke('network:join', address, name, unoMessage),
  disconnect: () => ipcRenderer.invoke('network:disconnect'),
  sendMessage: (message: string) => ipcRenderer.invoke('network:send', message),
  onMessage: (callback) => subscribe<[string]>('network:message', callback),
  onConnectionChange: (callback) => subscribe<[string, unknown?]>('network:status', callback),
  getNetworkAddresses: () => ipcRenderer.invoke('system:getNetworkAddresses')
}

contextBridge.exposeInMainWorld('api', api)
