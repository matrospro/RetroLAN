const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const isWin = os.platform() === 'win32'
const JAVA = isWin ? 'java.exe' : 'java'

const KNOWN = [
  { name: 'Minecraft Server', file: 'server.jar' },
  { name: 'Terraria Server', file: isWin ? 'TerrariaServer.exe' : 'TerrariaServer' }
]

class GameServerManager {
  constructor () {
    this.servers = new Map()
    this.configPath = path.join(os.homedir(), '.retrolan-servers.json')
    this.customServers = []
    this._loadCustom()
  }

  _findJava () {
    try {
      const out = execSync(`${JAVA} -version 2>&1`, { encoding: 'utf8' })
      return out.toLowerCase().includes('version')
    } catch { return false }
  }

  _loadCustom () {
    try { this.customServers = JSON.parse(fs.readFileSync(this.configPath, 'utf8')) } catch (e) { this.customServers = [] }
  }

  _saveCustom () {
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true })
    fs.writeFileSync(this.configPath, JSON.stringify(this.customServers, null, 2))
  }

  addCustom (name, exePath, args = '') {
    this.customServers.push({ name, exePath, args })
    this._saveCustom()
  }

  getServers () {
    const found = []
    for (const s of KNOWN) {
      const dirs = [
        os.homedir(),
        path.join(os.homedir(), 'Desktop'),
        path.join(os.homedir(), 'Downloads'),
        __dirname
      ]
      for (const dir of dirs) {
        const full = path.join(dir, s.file)
        if (fs.existsSync(full)) {
          found.push({ ...s, path: full })
          break
        }
      }
    }
    for (const s of this.customServers) {
      if (fs.existsSync(s.exePath)) found.push({ ...s, path: s.exePath, custom: true })
    }
    return found
  }

  start (serverId) {
    const all = this.getServers()
    const srv = all.find(s => s.name === serverId) || this.customServers.find(s => s.name === serverId)
    if (!srv) return { ok: false, error: 'Server non trovato' }
    if (this.servers.has(serverId)) return { ok: false, error: 'Già avviato' }

    if (srv.path.endsWith('.jar')) {
      if (!this._findJava()) return { ok: false, error: 'Java non trovato. Installa Java Runtime.' }
      const proc = spawn(JAVA, ['-jar', srv.path, 'nogui'], { cwd: path.dirname(srv.path), detached: false })
      this.servers.set(serverId, proc)
      proc.stdout.on('data', (d) => this.emit?.('server-log', { serverId, line: d.toString() }))
      proc.stderr.on('data', (d) => this.emit?.('server-log', { serverId, line: d.toString() }))
      proc.on('exit', () => { this.servers.delete(serverId); this.emit?.('server-stop', serverId) })
      return { ok: true }
    }

    if (fs.existsSync(srv.path)) {
      const proc = spawn(srv.path, [], { cwd: path.dirname(srv.path), detached: false })
      this.servers.set(serverId, proc)
      proc.on('exit', () => { this.servers.delete(serverId); this.emit?.('server-stop', serverId) })
      return { ok: true }
    }

    return { ok: false, error: 'File eseguibile non trovato' }
  }

  stop (serverId) {
    const proc = this.servers.get(serverId)
    if (!proc) return { ok: false, error: 'Non avviato' }
    if (isWin) {
      execSync(`taskkill /PID ${proc.pid} /F 2>nul`)
    } else {
      proc.kill('SIGTERM')
    }
    this.servers.delete(serverId)
    return { ok: true }
  }

  isRunning (serverId) { return this.servers.has(serverId) }
  start () {}
  stop () { for (const [, p] of this.servers) this.stop(p) }
}

module.exports = { GameServerManager }
