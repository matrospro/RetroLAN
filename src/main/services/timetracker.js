const EventEmitter = require('events')
const { exec } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs')

const isWin = os.platform() === 'win32'

class TimeTracker extends EventEmitter {
  constructor () {
    super()
    this.sessions = new Map()
    this.history = []
    this.configPath = path.join(os.homedir(), '.retrolan-gametime.json')
    this._load()
  }

  _load () {
    try { this.history = JSON.parse(fs.readFileSync(this.configPath, 'utf8')) } catch (e) { this.history = [] }
  }

  _save () { fs.writeFileSync(this.configPath, JSON.stringify(this.history.slice(-1000), null, 2)) }

  checkRunningGames (knownGames = []) {
    const cmd = isWin ? 'tasklist /FO CSV' : 'ps -A -o comm='
    exec(cmd, (err, stdout) => {
      if (err) return
      const procs = stdout.toLowerCase()
      for (const game of knownGames) {
        const g = game.toLowerCase()
        const isRunning = procs.includes(g) || procs.includes(g + '.exe')
        const existing = this.sessions.get(game)
        if (isRunning && !existing) {
          this.sessions.set(game, { game, start: Date.now() })
          this.emit('game-started', { game })
        } else if (!isRunning && existing) {
          const duration = Date.now() - existing.start
          const entry = { game, start: existing.start, end: Date.now(), duration, date: new Date().toISOString().split('T')[0] }
          this.history.push(entry)
          this.sessions.delete(game)
          this._save()
          this.emit('game-stopped', entry)
        }
      }
    })
  }

  getStats (game) {
    if (game) return this.history.filter(e => e.game === game)
    const totals = {}
    for (const e of this.history) {
      if (!totals[e.game]) totals[e.game] = 0
      totals[e.game] += e.duration
    }
    const active = Array.from(this.sessions.values()).map(s => ({
      game: s.game, running: true, elapsed: Date.now() - s.start
    }))
    return { totals, active, total: this.history.length }
  }

  start () {
    this.interval = setInterval(() => this.checkRunningGames([]), 10000)
  }

  stop () { clearInterval(this.interval) }
}

module.exports = { TimeTracker }
