import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useGameStore } from '../../stores/gameStore'

interface ChallengeDialogProps {
  open: boolean
  onClose: () => void
}

export default function ChallengeDialog({ open, onClose }: ChallengeDialogProps) {
  const { sendAction, gameState } = useGameStore()

  // Resolve the challenged player from server-authoritative plusChain state,
  // not from index arithmetic that ignores direction / disconnected players.
  const wildPlayerId = gameState?.plusChain?.lastWildPlayerId
  const wildPlayer = gameState?.players.find(p => p.id === wildPlayerId)

  const handleChallenge = () => {
    sendAction({ type: 'challenge-wild' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Challenge Wild +card?">
      <p className="text-gray-300 text-sm font-game mb-4">
        Do you think <strong>{wildPlayer?.name ?? '…'}</strong> had a matching color card?
        If they did, they draw the penalty. If not, you draw extra.
      </p>
      <div className="flex gap-3">
        <Button onClick={handleChallenge} variant="danger" className="flex-1">
          🎯 Challenge
        </Button>
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Let it go
        </Button>
      </div>
    </Modal>
  )
}
