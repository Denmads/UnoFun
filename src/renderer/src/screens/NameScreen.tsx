import { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useGameStore } from '../stores/gameStore'
import { DEFAULT_PORT } from '../../../shared/constants'

export default function NameScreen() {
  const {
    mode, playerName, unoMessage, setPlayerName, setUnoMessage,
    setScreen, connect, connectionError
  } = useGameStore()

  const [address, setAddress] = useState('')
  const [port, setPort] = useState(String(DEFAULT_PORT))
  const [connecting, setConnecting] = useState(false)
  const [nameError, setNameError] = useState('')
  const [unoError, setUnoError] = useState('')

  const validate = (): boolean => {
    let valid = true
    if (!playerName.trim()) {
      setNameError('Please enter a name')
      valid = false
    } else {
      setNameError('')
    }

    if (!unoMessage.toLowerCase().includes('uno')) {
      setUnoError('Message must contain "Uno"')
      valid = false
    } else {
      setUnoError('')
    }

    return valid
  }

  const handleConnect = async () => {
    if (!validate()) return

    setConnecting(true)
    try {
      if (mode === 'host') {
        await connect(Number(port))
      } else {
        const fullAddress = address || `localhost:${port}`
        await connect(Number(port), fullAddress)
      }
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-uno-black flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-uno-dark border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl"
      >
        <button
          onClick={() => setScreen('start')}
          className="text-gray-400 hover:text-white transition-colors mb-4 text-sm font-game"
        >
          ← Back
        </button>

        <h2 className="text-3xl font-bold font-game text-white mb-1">
          {mode === 'host' ? '🎮 Host Game' : '🔗 Join Game'}
        </h2>
        <p className="text-gray-400 text-sm font-game mb-6">
          {mode === 'host' ? 'Set up your profile and start hosting' : 'Enter your info and connect'}
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label="Display Name"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            error={nameError}
            maxLength={20}
            autoFocus
          />

          <Input
            label="UNO Announcement"
            placeholder="UNO!"
            value={unoMessage}
            onChange={(e) => setUnoMessage(e.target.value)}
            error={unoError}
            maxLength={50}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Your custom message when calling UNO (must include &quot;Uno&quot;)
          </p>

          {mode === 'host' ? (
            <Input
              label="Port"
              placeholder={String(DEFAULT_PORT)}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              type="number"
            />
          ) : (
            <Input
              label="Server Address"
              placeholder={`e.g. 192.168.1.100:${DEFAULT_PORT}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          )}

          {connectionError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm font-game">
              {connectionError}
            </div>
          )}

          <Button
            size="lg"
            onClick={handleConnect}
            disabled={connecting}
            className="w-full mt-2"
          >
            {connecting
              ? '⏳ Connecting...'
              : mode === 'host'
                ? '🚀 Start Hosting'
                : '🔗 Connect'
            }
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
