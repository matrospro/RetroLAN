const { exec } = require('child_process')
const os = require('os')

const isWin = os.platform() === 'win32'

class WakeOnLAN {
  start () {}

  getMacFromIP (targetIp) {
    return new Promise((resolve) => {
      if (isWin) {
        exec(`arp -a ${targetIp}`, (err, stdout) => {
          if (err) return resolve(null)
          const match = stdout.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/)
          resolve(match ? match[0].replace(/-/g, ':') : null)
        })
      } else {
        exec(`arp -n ${targetIp} 2>/dev/null || arp ${targetIp} 2>/dev/null`, (err, stdout) => {
          if (err) return resolve(null)
          const match = stdout.match(/([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})/)
          resolve(match ? match[0] : null)
        })
      }
    })
  }

  async send (targetIp) {
    const mac = await this.getMacFromIP(targetIp)
    if (!mac) return { ok: false, error: 'MAC non trovato. Il PC deve essere stato in rete.' }

    const magic = mac.split(':').map(b => parseInt(b, 16))
    const packet = Buffer.alloc(102, 0xFF)
    for (let i = 0; i < 16; i++) {
      magic.forEach((b, j) => { packet[6 + i * 6 + j] = b })
    }

    const dgram = require('dgram')
    const sock = dgram.createSocket('udp4')
    sock.send(packet, 0, packet.length, 9, '255.255.255.255', () => sock.close())
    return { ok: true, mac }
  }

  stop () {}
}

module.exports = { WakeOnLAN }
