const EventEmitter = require('events')
const net = require('net')

const KNOWN_PORTS = {
  'Minecraft': 25565,
  'Terraria': 7777,
  'Valheim': 2456,
  'Factorio': 34197,
  'CS2': 27015,
  'Left 4 Dead 2': 27015
}

class ServerScanner extends EventEmitter {
  constructor () {
    super()
    this.servers = []
    this.interval = null
  }

  async scanPort (ip, port, name = 'Unknown') {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.on('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.on('timeout', () => {
        socket.destroy()
        resolve(false)
      })
      socket.on('error', () => resolve(false))
      socket.connect(port, ip)
    })
  }

  async scanNetwork (baseIP) {
    const results = []
    const base = baseIP || '192.168.1'
    const tasks = []

    for (let i = 1; i <= 254; i++) {
      const ip = `${base}.${i}`
      for (const [game, port] of Object.entries(KNOWN_PORTS)) {
        tasks.push(
          this.scanPort(ip, port, game).then(open => {
            if (open) {
              const server = { ip, port, game, name: `${game} Server`, online: true }
              results.push(server)
              this.emit('server-found', server)
            }
          })
        )
      }
    }

    await Promise.all(tasks)
    this.servers = results
    return results
  }

  async start () {
    this.scanNetwork()
    this.interval = setInterval(() => this.scanNetwork(), 60000)
  }

  joinServer (ip, port) {
    const { exec } = require('child_process')
    exec(`start steam://connect/${ip}:${port}`)
  }

  stop () {
    clearInterval(this.interval)
  }
}

module.exports = { ServerScanner }
