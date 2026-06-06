const ACHIEVEMENTS = {
  first_connect: { id: 'first_connect', name: '🏆 Primo a connettersi', description: 'Connettiti per la prima volta alla LAN', icon: '🔌' },
  host_100: { id: 'host_100', name: '🏆 Ha hostato 100 server', description: 'Crea o unisciti a 100 lobby/server', icon: '🎯' },
  lan_12h: { id: 'lan_12h', name: '🏆 LAN Party da 12 ore', description: 'Rimani connesso per 12 ore totali', icon: '⏰' },
  transfer_500gb: { id: 'transfer_500gb', name: '🏆 Trasferiti 500 GB', description: 'Trasferisci 500 GB in totale sulla LAN', icon: '📦' },
  first_lobby: { id: 'first_lobby', name: '🏆 Prima Lobby', description: 'Crea la tua prima stanza LAN', icon: '🏠' },
  five_players: { id: 'five_players', name: '🏆 5 Amici nella LAN', description: 'Connetti 5 giocatori diversi', icon: '👥' }
}

class AchievementSystem {
  constructor (store) {
    this.store = store
    this.unlocked = new Set(store.get('achievements', []))
    this.totalTransferBytes = 0
    this.connectedTime = 0
    this.hostCount = 0
    this.startTime = Date.now()
  }

  unlock (achievementId, value) {
    if (this.unlocked.has(achievementId)) return false
    const ach = ACHIEVEMENTS[achievementId]
    if (!ach) return false

    if (achievementId === 'lan_12h') {
      if (Date.now() - this.startTime < 12 * 60 * 60 * 1000) return false
    }
    if (achievementId === 'transfer_500gb') {
      this.totalTransferBytes += value || 0
      if (this.totalTransferBytes < 500 * 1024 * 1024 * 1024) return false
    }
    if (achievementId === 'host_100') {
      this.hostCount++
      if (this.hostCount < 100) return false
    }

    this.unlocked.add(achievementId)
    const list = Array.from(this.unlocked)
    this.store.set('achievements', list)
    return true
  }

  checkLobbyDuration (peers) {
    if (peers.length > 0) {
      this.connectedTime += 60000
      if (this.connectedTime >= 12 * 60 * 60 * 1000) {
        this.unlock('lan_12h')
      }
    }
  }

  checkHostCount () {
    this.hostCount = this.store.get('lobbyHistory', []).length
    if (this.hostCount >= 100) this.unlock('host_100')
  }

  getAll () {
    return Object.values(ACHIEVEMENTS).map(a => ({
      ...a,
      unlocked: this.unlocked.has(a.id)
    }))
  }

  start () {}
  stop () {}
}

module.exports = { AchievementSystem }
