const EventEmitter = require('events')
const dgram = require('dgram')

const LOBBY_PORT = 42073

class LobbyManager extends EventEmitter {
  constructor (username) {
    super()
    this.username = username
    this.lobbies = new Map()
    this.currentLobby = null
    this.socket = null
  }

  start () {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString())
          if (data.type === 'lobby-announce') {
            const existing = this.lobbies.get(data.id)
            if (existing) {
              Object.assign(existing, data, { lastSeen: Date.now() })
            } else {
              this.lobbies.set(data.id, { ...data, lastSeen: Date.now() })
            }
            this.emit('lobby-update', Array.from(this.lobbies.values()))
          } else if (data.type === 'lobby-join' && this.currentLobby) {
            this.emit('lobby-update', this.currentLobby)
          }
        } catch (e) { /* ignore */ }
      })

      this.socket.bind(LOBBY_PORT, () => {
        this.socket.setBroadcast(true)
        resolve()
      })
    })
  }

  create (name, games = []) {
    const id = `${this.username}-${Date.now()}`
    const lobby = {
      id,
      name,
      host: this.username,
      games,
      players: [{ name: this.username, ip: '' }],
      createdAt: Date.now()
    }
    this.lobbies.set(id, lobby)
    this.currentLobby = lobby
    this.announce(lobby)
    return lobby
  }

  join (lobbyId) {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return null
    lobby.players.push({ name: this.username, ip: '' })
    this.currentLobby = lobby
    const msg = JSON.stringify({ type: 'lobby-join', lobbyId, name: this.username })
    this.socket.send(msg, 0, msg.length, LOBBY_PORT, '255.255.255.255')
    return lobby
  }

  leave () {
    this.currentLobby = null
  }

  announce (lobby) {
    const msg = JSON.stringify({ type: 'lobby-announce', ...lobby })
    this.socket.send(msg, 0, msg.length, LOBBY_PORT, '255.255.255.255')
  }

  getLobbies () {
    const now = Date.now()
    for (const [id, lobby] of this.lobbies) {
      if (now - lobby.lastSeen > 30000) this.lobbies.delete(id)
    }
    return Array.from(this.lobbies.values())
  }

  stop () {
    this.socket?.close()
  }
}

module.exports = { LobbyManager }
