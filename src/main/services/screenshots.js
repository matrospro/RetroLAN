const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const os = require('os')

const isWin = os.platform() === 'win32'
const isMac = os.platform() === 'darwin'

const SCREENSHOT_DIRS = isWin
  ? [path.join(os.homedir(), 'Pictures', 'Screenshots')]
  : isMac
    ? [path.join(os.homedir(), 'Pictures', 'Screenshots'), path.join(os.homedir(), 'Library', 'Application Support', 'Steam', 'userdata')]
    : [path.join(os.homedir(), 'Pictures', 'Screenshots'), path.join(os.homedir(), '.steam')]

class ScreenshotHub extends EventEmitter {
  constructor () {
    super()
    this.watchDir = path.join(os.homedir(), '.retrolan', 'screenshots')
    this.sharedDir = path.join(os.homedir(), '.retrolan', 'shared-screenshots')
    this.screenshots = []
    this.watchers = []
    fs.mkdirSync(this.watchDir, { recursive: true })
    fs.mkdirSync(this.sharedDir, { recursive: true })
    this._scanExisting()
  }

  _scanExisting () {
    try {
      for (const f of fs.readdirSync(this.watchDir)) {
        if (/\.(png|jpg|jpeg|bmp|gif)$/i.test(f)) {
          const full = path.join(this.watchDir, f)
          this.screenshots.push({
            name: f, path: full,
            size: fs.statSync(full).size,
            time: fs.statSync(full).mtimeMs
          })
        }
      }
    } catch (e) { /* ignore */ }
  }

  watchExternal (dir) {
    if (!fs.existsSync(dir)) return
    try {
      const watcher = fs.watch(dir, (event, filename) => {
        if (filename && /\.(png|jpg|jpeg|bmp)$/i.test(filename)) {
          const src = path.join(dir, filename)
          const dest = path.join(this.watchDir, filename)
          try {
            fs.copyFileSync(src, dest)
            const entry = { name: filename, path: dest, size: fs.statSync(dest).size, time: Date.now() }
            this.screenshots.push(entry)
            this.emit('new-screenshot', entry)
          } catch (e) { /* ignore */ }
        }
      })
      this.watchers.push(watcher)
    } catch (e) { /* ignore */ }
  }

  getScreenshots () {
    return this.screenshots.sort((a, b) => b.time - a.time)
  }

  copyToShare (filePath) {
    const name = path.basename(filePath)
    const dest = path.join(this.sharedDir, name)
    fs.copyFileSync(filePath, dest)
    return dest
  }

  start () {
    for (const d of SCREENSHOT_DIRS) this.watchExternal(d)
  }

  stop () {
    for (const w of this.watchers) try { w.close() } catch (e) { /* ignore */ }
  }
}

module.exports = { ScreenshotHub }
