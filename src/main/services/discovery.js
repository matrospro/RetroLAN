const EventEmitter = require('events')
const dgram = require('dgram')
const os = require('os')

const BROADCAST_PORT = 42069
const BROADCAST_ADDR = '255.255.255.255'
const DISCOVER_INTERVAL = 3000
const PEER_TIMEOUT = 15000

class NetworkDiscovery extends EventEmitter {
  constructor (username) {
    super()
    this.username = username
    this.peers = new Map()
    this.socket = null
    this.interval = null
  }

  getLocalIP () {
    const ifaces = os.networkInterfaces()
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address
      }
    }
    return '127.0.0.1'
  }

  getNetworkMap () {
    const map = { router: this.getLocalIP().replace(/\.\d+$/, '.1'), nodes: [] }
    for (const [id, peer] of this.peers) {
      map.nodes.push({
        id,
        name: peer.name,
        ip: peer.ip,
        hostname: peer.hostname,
        isOnline: true,
        devices: peer.devices || []
      })
    }
    return map
  }

  start () {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString())
          if (data.type === 'retrolan-ping') {
            const peerId = data.id || rinfo.address
            const existing = this.peers.get(peerId)
            this.peers.set(peerId, {
              id: peerId,
              name: data.name || data.hostname,
              ip: rinfo.address,
              hostname: data.hostname,
              games: data.games || existing?.games || [],
              stats: data.stats || existing?.stats || {},
              lastSeen: Date.now(),
              devices: data.devices || existing?.devices || []
            })

            if (!existing) {
              this.emit('peer-join', this.peers.get(peerId))
            } else {
              this.emit('peer-update', this.peers.get(peerId))
            }

            const pong = JSON.stringify({
              type: 'retrolan-pong',
              name: this.username,
              hostname: os.hostname(),
              id: `${this.getLocalIP()}-${process.pid}`
            })
            this.socket.send(pong, 0, pong.length, BROADCAST_PORT, rinfo.address)
          }
        } catch (e) { /* ignore malformed */ }
      })

      this.socket.on('listening', () => {
        this.socket.setBroadcast(true)
        this.socket.setMulticastTTL(128)
        resolve()
      })

      this.socket.bind(BROADCAST_PORT)

      this.interval = setInterval(() => {
        const now = Date.now()
        for (const [id, peer] of this.peers) {
          if (now - peer.lastSeen > PEER_TIMEOUT) {
            this.peers.delete(id)
            this.emit('peer-leave', peer)
          }
        }

        const ping = JSON.stringify({
          type: 'retrolan-ping',
          name: this.username,
          hostname: os.hostname(),
          id: `${this.getLocalIP()}-${process.pid}`
        })
        this.socket.send(ping, 0, ping.length, BROADCAST_PORT, BROADCAST_ADDR)
      }, DISCOVER_INTERVAL)
    })
  }

  setName (name) {
    this.username = name
  }

  getPeers () {
    return Array.from(this.peers.values())
  }

  stop () {
    clearInterval(this.interval)
    this.socket?.close()
  }
}

module.exports = { NetworkDiscovery }
