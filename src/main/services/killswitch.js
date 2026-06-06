const { exec } = require('child_process')
const os = require('os')

const PLATFORM = os.platform()

class Killswitch {
  constructor () { this.active = false }

  _getSubnet () {
    const ifaces = os.networkInterfaces()
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = (iface.cidr || '').split('/')
          if (parts[0]) {
            const ip = parts[0]
            const mask = parseInt(parts[1]) || 24
            const subnet = ip.split('.').slice(0, 3).join('.') + '.0'
            return { subnet: subnet + '/' + mask, ip }
          }
        }
      }
    }
    return { subnet: '192.168.1.0/24', ip: '127.0.0.1' }
  }

  enable () {
    return new Promise((resolve) => {
      const { subnet } = this._getSubnet()

      if (PLATFORM === 'win32') {
        exec(`netsh advfirewall firewall add rule name="RetroLAN_Block" dir=out action=block protocol=any`, (e1) => {
          if (e1) return resolve({ ok: false, error: 'Esegui come amministratore.' })
          exec(`netsh advfirewall firewall add rule name="RetroLAN_AllowLAN" dir=out action=allow remoteip=${subnet} protocol=any`, () => {
            exec(`netsh advfirewall firewall add rule name="RetroLAN_AllowLocal" dir=out action=allow remoteip=127.0.0.1 protocol=any`, () => {
              this.active = true; resolve({ ok: true })
            })
          })
        })
      } else if (PLATFORM === 'linux') {
        // iptables: drop all outgoing except LAN subnet
        const cmds = [
          `iptables -A OUTPUT -d ${subnet} -j ACCEPT`,
          `iptables -A OUTPUT -d 127.0.0.0/8 -j ACCEPT`,
          `iptables -A OUTPUT -j DROP`
        ]
        exec(cmds.join('; '), (e) => {
          if (e) return resolve({ ok: false, error: 'Esegui come root o manca iptables.' })
          this.active = true; resolve({ ok: true })
        })
      } else if (PLATFORM === 'darwin') {
        // macOS pfctl
        const rules = `
block drop out all
pass out quick inet from ${subnet} to any
pass out quick proto tcp from any to 127.0.0.0/8
`
        exec(`echo "${rules}" | sudo pfctl -ef -`, (e) => {
          if (e) return resolve({ ok: false, error: 'Esegui come amministratore.' })
          this.active = true; resolve({ ok: true })
        })
      } else {
        resolve({ ok: false, error: 'OS non supportato.' })
      }
    })
  }

  disable () {
    return new Promise((resolve) => {
      if (PLATFORM === 'win32') {
        exec(`netsh advfirewall firewall delete rule name="RetroLAN_Block"`, () => {
          exec(`netsh advfirewall firewall delete rule name="RetroLAN_AllowLAN"`, () => {
            exec(`netsh advfirewall firewall delete rule name="RetroLAN_AllowLocal"`, () => {
              this.active = false; resolve({ ok: true })
            })
          })
        })
      } else if (PLATFORM === 'linux') {
        exec(`iptables -F OUTPUT`, (e) => {
          this.active = false; resolve({ ok: true })
        })
      } else if (PLATFORM === 'darwin') {
        exec(`sudo pfctl -d`, () => {
          this.active = false; resolve({ ok: true })
        })
      } else {
        resolve({ ok: false, error: 'OS non supportato.' })
      }
    })
  }

  getStatus () { return this.active }
  start () {}
  stop () {}
}

module.exports = { Killswitch }
