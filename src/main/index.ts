import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { networkInterfaces } from 'os'
import { GameServer } from './network/server'
import { GameClient } from './network/client'
import type { ClientMessage, ServerMessage } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let gameServer: GameServer | null = null
let gameClient: GameClient | null = null

function createWindow(): BrowserWindow {
  const preloadPath = join(__dirname, '../preload/index.js')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'UnoFun',
    backgroundColor: '#1A1A2E',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && rendererUrl) {
    mainWindow.loadURL(rendererUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function getLocalIPAddresses(): string[] {
  const nets = networkInterfaces()
  const addresses: string[] = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address)
      }
    }
  }
  return addresses
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (!mainWindow) return
  mainWindow.webContents.send(channel, ...args)
}

function registerIpcHandlers(): void {
  ipcMain.handle('system:getNetworkAddresses', () => {
    return getLocalIPAddresses()
  })

  // Host a game
  ipcMain.handle('network:host', async (_event, port: number, name: string, unoMessage: string) => {
    try {
      gameServer = new GameServer()

      gameServer.setEventHandler((event, data) => {
        if (event === 'message') {
          sendToRenderer('network:message', data as string)
        } else {
          sendToRenderer('network:status', event, data)
        }
      })

      await gameServer.start(port)
      const playerId = gameServer.addLocalPlayer(name, unoMessage)
      return { success: true, playerId }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Join a game
  ipcMain.handle('network:join', async (_event, address: string, name: string, unoMessage: string) => {
    try {
      gameClient = new GameClient()

      gameClient.setMessageHandler((msg: ServerMessage) => {
        sendToRenderer('network:message', JSON.stringify(msg))
      })

      gameClient.setStatusHandler((status, data) => {
        sendToRenderer('network:status', status, data)
      })

      await gameClient.connect(address)

      // Send join message
      gameClient.send({ type: 'join', name, unoMessage })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Send message (used by both host and client)
  ipcMain.handle('network:send', (_event, message: string) => {
    try {
      const msg = JSON.parse(message) as ClientMessage
      if (gameServer) {
        gameServer.handleLocalAction(msg)
      } else if (gameClient) {
        gameClient.send(msg)
      }
    } catch (err: any) {
      console.error('[network:send] Error:', err.message)
    }
  })

  // Disconnect
  ipcMain.handle('network:disconnect', () => {
    if (gameServer) {
      gameServer.stop()
      gameServer = null
    }
    if (gameClient) {
      gameClient.disconnect()
      gameClient = null
    }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((err) => {
  console.error('[main] Failed to start:', err)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[main] Unhandled rejection:', err)
})
