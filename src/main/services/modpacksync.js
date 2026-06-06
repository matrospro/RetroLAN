const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')

const isWin = os.platform() === 'win32'

class ModpackSync extends EventEmitter {
  constructor () {
    super()
    this.modpacksDir = path.join(os.homedir(), '.retrolan', 'modpacks')
    fs.mkdirSync(this.modpacksDir, { recursive: true })
  }

  getModpacks () {
    try {
      return fs.readdirSync(this.modpacksDir)
        .filter(f => f.endsWith('.zip'))
        .map(f => ({
          name: f.replace('.zip', ''),
          file: f,
          size: fs.statSync(path.join(this.modpacksDir, f)).size
        }))
    } catch { return [] }
  }

  _zipDir (source, dest) {
    return new Promise((resolve, reject) => {
      if (isWin) {
        // Use PowerShell Compress-Archive (built-in on Windows 10+)
        const ps = spawn('powershell', [
          '-NoProfile', '-Command',
          `Compress-Archive -Path '${source}\\*' -DestinationPath '${dest}' -Force`
        ])
        ps.on('close', (code) => code === 0 ? resolve() : reject(new Error('zip fallita')))
      } else {
        // Use system zip command (available on macOS/Linux)
        const z = spawn('zip', ['-r', dest, '.'], { cwd: source })
        z.on('close', (code) => code === 0 ? resolve() : reject(new Error('zip fallita')))
      }
    })
  }

  async packAndShare (sourcePath) {
    if (!fs.existsSync(sourcePath)) return { ok: false, error: 'Percorso non trovato' }
    const name = path.basename(sourcePath, path.extname(sourcePath))
    const zipPath = path.join(this.modpacksDir, `${name}-${Date.now()}.zip`)

    if (fs.statSync(sourcePath).isDirectory()) {
      try {
        await this._zipDir(sourcePath, zipPath)
        return { ok: true, zipPath, name, size: fs.statSync(zipPath).size }
      } catch (e) {
        return { ok: false, error: 'Errore nella compressione: ' + e.message }
      }
    } else {
      // Single file — just copy
      fs.copyFileSync(sourcePath, zipPath)
      return { ok: true, zipPath, name, size: fs.statSync(zipPath).size }
    }
  }

  receive (zipPath) {
    const dest = path.join(this.modpacksDir, path.basename(zipPath))
    fs.copyFileSync(zipPath, dest)
    return { ok: true, path: dest }
  }

  start () {}
  stop () {}
}

module.exports = { ModpackSync }
