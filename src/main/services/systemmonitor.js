const os = require('os')
const si = require('systeminformation')

class SystemMonitor {
  constructor () {
    this.cache = {}
  }

  async getStats () {
    try {
      const [cpu, mem, network, fsSize] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.fsSize()
      ])

      return {
        cpu: {
          usage: Math.round(cpu.currentLoad * 100) / 100,
          model: os.cpus()[0]?.model || 'unknown',
          cores: os.cpus().length
        },
        ram: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usagePercent: Math.round((mem.used / mem.total) * 100 * 100) / 100
        },
        network: network.length > 0 ? {
          rx: network[0].rx_sec,
          tx: network[0].tx_sec
        } : null,
        disk: fsSize.map(d => ({
          mount: d.mount,
          total: d.size,
          used: d.used,
          free: d.available,
          usagePercent: Math.round(d.use * 100) / 100
        })),
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime()
      }
    } catch (e) {
      return this.getFallbackStats()
    }
  }

  getFallbackStats () {
    return {
      cpu: {
        usage: 0,
        model: os.cpus()[0]?.model || 'unknown',
        cores: os.cpus().length
      },
      ram: {
        total: os.totalmem(),
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100 * 100) / 100
      },
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: os.uptime()
    }
  }

  start () { return Promise.resolve() }
  stop () {}
}

module.exports = { SystemMonitor }
