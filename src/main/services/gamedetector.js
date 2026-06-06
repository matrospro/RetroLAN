const EventEmitter = require('events')
const { exec, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PLATFORM = os.platform()
const isWin = PLATFORM === 'win32'
const isMac = PLATFORM === 'darwin'
const isLinux = PLATFORM === 'linux'

const STEAM_PATHS = isWin
  ? ['C:\\Program Files (x86)\\Steam\\steamapps\\common', 'C:\\Program Files\\Steam\\steamapps\\common']
  : isMac
    ? [path.join(os.homedir(), 'Library', 'Application Support', 'Steam', 'steamapps', 'common')]
    : [path.join(os.homedir(), '.steam', 'steam', 'steamapps', 'common'), path.join(os.homedir(), '.local', 'share', 'Steam', 'steamapps', 'common')]

const MC_PATH = isWin
  ? path.join(process.env.APPDATA || '', '.minecraft')
  : isMac
    ? path.join(os.homedir(), 'Library', 'Application Support', 'minecraft')
    : path.join(os.homedir(), '.minecraft')

class GameDetector extends EventEmitter {
  constructor () {
    super()
    this.installedGames = []
    this.interval = null
  }

  async detectSteamGames () {
    const games = []
    for (const steamPath of STEAM_PATHS) {
      try {
        if (fs.existsSync(steamPath)) {
          for (const dir of fs.readdirSync(steamPath)) {
            games.push({ name: dir, platform: 'steam', path: path.join(steamPath, dir) })
          }
        }
      } catch (e) { /* skip */ }
    }
    return games
  }

  detectMinecraft () {
    try {
      if (fs.existsSync(MC_PATH)) {
        const versionsDir = path.join(MC_PATH, 'versions')
        const versions = fs.existsSync(versionsDir) ? fs.readdirSync(versionsDir).filter(v => !v.endsWith('.json')) : []
        return [{ name: 'Minecraft', platform: 'mojang', path: MC_PATH, versions }]
      }
    } catch (e) { /* ignore */ }
    return []
  }

  async detectRunningProcesses () {
    return new Promise((resolve) => {
      if (isWin) {
        exec('tasklist', (err, stdout) => {
          if (err) return resolve([])
          const procs = stdout.toLowerCase()
          const running = []
          if (procs.includes('javaw.exe') || procs.includes('java.exe')) running.push('Minecraft')
          if (procs.includes('cs2.exe')) running.push('Counter-Strike 2')
          if (procs.includes('left4dead2.exe')) running.push('Left 4 Dead 2')
          if (procs.includes('terraria.exe')) running.push('Terraria')
          resolve(running)
        })
      } else {
        exec(isMac ? 'ps aux' : 'ps -A', (err, stdout) => {
          if (err) return resolve([])
          const procs = stdout.toLowerCase()
          const running = []
          if (procs.includes('java')) running.push('Minecraft')
          if (procs.includes('cs2')) running.push('Counter-Strike 2')
          if (procs.includes('left4dead2')) running.push('Left 4 Dead 2')
          if (procs.includes('terraria')) running.push('Terraria')
          resolve(running)
        })
      }
    })
  }

  async start () {
    const scan = async () => {
      const steam = await this.detectSteamGames()
      const mc = this.detectMinecraft()
      const running = await this.detectRunningProcesses()
      this.installedGames = [...steam, ...mc].map(g => ({
        ...g, running: running.includes(g.name)
      }))
      this.emit('games-updated', this.installedGames)
    }
    await scan()
    this.interval = setInterval(scan, 30000)
  }

  getGames () { return this.installedGames }

  launch (gameId) {
    const game = this.installedGames.find(g => g.name === gameId)
    if (!game) return false
    const launchCmd = isWin ? 'start ""' : isMac ? 'open' : 'xdg-open'
    if (game.platform === 'steam') {
      exec(`${launchCmd} steam://rungameid/${game.steamId || ''}`)
    } else {
      exec(`${launchCmd} "${game.path}"`)
    }
    return true
  }

  stop () { clearInterval(this.interval) }
}

module.exports = { GameDetector }
