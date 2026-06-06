const EventEmitter = require('events')
const { exec } = require('child_process')
const net = require('net')
const os = require('os')

const isWin = os.platform() === 'win32'

class NetDiag extends EventEmitter {
  constructor () { super() }

  ping (ip) {
    return new Promise((resolve) => {
      const flag = isWin ? '-n' : '-c'
      const timeout = isWin ? '-w 2000' : '-W 2'
      const start = Date.now()
      exec(`ping ${flag} 1 ${timeout} ${ip}`, (err, stdout) => {
        const match = stdout.match(/(?:time|tempo)[=<]\s*(\d+)/i)
        const latency = match ? parseInt(match[1]) : (err ? null : Date.now() - start)
        resolve({ ip, alive: !err && latency !== null, latency })
      })
    })
  }

  async pingAll (peers) {
    const results = []
    for (const p of peers) {
      const r = await this.ping(p.ip)
      results.push({ ...r, name: p.name })
    }
    return results
  }

  speedTest (targetIp) {
    return new Promise((resolve) => {
      const server = net.createServer((socket) => {
        const start = Date.now()
        let received = 0
        socket.on('data', (d) => { received += d.length })
        socket.on('end', () => {
          const duration = (Date.now() - start) / 1000
          const mbps = duration > 0 ? (received / duration / 125000).toFixed(1) : 0
          server.close()
          resolve({ duration, bytes: received, mbps: parseFloat(mbps) })
        })
      })
      server.listen(0, () => {
        const port = server.address().port
        const client = new net.Socket()
        const data = Buffer.alloc(10485760, 65) // 10MB
        client.connect(port, targetIp, () => {
          client.write(data, () => client.end())
        })
        client.on('error', () => { server.close(); resolve({ error: 'Connessione fallita' }) })
      })
      setTimeout(() => { server.close(); resolve({ error: 'Timeout' }) }, 15000)
    })
  }

  start () {}
  stop () {}
}

module.exports = { NetDiag }
