const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')
const os = require('os')
const { autoUpdater } = require('electron-updater')

const { NetworkDiscovery } = require('./services/discovery')
const { ChatService } = require('./services/chat')
const { FileTransfer } = require('./services/filetransfer')
const { GameDetector } = require('./services/gamedetector')
const { SystemMonitor } = require('./services/systemmonitor')
const { AchievementSystem } = require('./services/achievements')
const { LobbyManager } = require('./services/lobby')
const { ServerScanner } = require('./services/serverscanner')
const { WakeOnLAN } = require('./services/wol')
const { GameServerManager } = require('./services/gameserver')
const { ModpackSync } = require('./services/modpacksync')
const { Jukebox } = require('./services/jukebox')
const { Tournament } = require('./services/tournament')
const { Killswitch } = require('./services/killswitch')
const { ScreenshotHub } = require('./services/screenshots')
const { NetDiag } = require('./services/netdiag')
const { TimeTracker } = require('./services/timetracker')
const Store = require('electron-store')

const store = new Store({
  defaults: {
    username: os.hostname(),
    achievements: [],
    lobbyHistory: [],
    autoStart: false,
    minimizeToTray: true
  }
})

let mainWindow, services = {}, tray = null

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const isDev = process.env.NODE_ENV === 'development'

const iconPath = path.join(__dirname, '..', '..', 'build', isMac ? 'icon.png' : 'icon.png')

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280, height: 840, minWidth: 960, minHeight: 640,
    frame: !isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:9000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'public', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (!isDev) checkForUpdates()
  })

  mainWindow.on('close', (e) => {
    if (store.get('minimizeToTray') && tray) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray () {
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('RetroLAN v2.0')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Apri RetroLAN', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    {
      label: 'Killswitch', click: () => {
        if (services.killswitch?.getStatus()) {
          services.killswitch.disable().then(() => updateTrayMenu())
        } else {
          services.killswitch.enable().then(() => updateTrayMenu())
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Avvio automatico', type: 'checkbox', checked: store.get('autoStart'),
      click: (e) => toggleAutoStart(e.checked)
    },
    { type: 'separator' },
    { label: 'Esci', click: () => { tray = null; app.quit() } }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

function updateTrayMenu () {
  if (!tray) return
  const ks = services.killswitch?.getStatus()
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Apri RetroLAN', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    {
      label: ks ? '🔴 Disattiva Killswitch' : '🟢 Attiva Killswitch',
      click: async () => {
        if (ks) { await services.killswitch.disable() } else { await services.killswitch.enable() }
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Avvio automatico', type: 'checkbox', checked: store.get('autoStart'),
      click: (e) => toggleAutoStart(e.checked)
    },
    { type: 'separator' },
    { label: 'Esci', click: () => { tray = null; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
}

function toggleAutoStart (enable) {
  store.set('autoStart', enable)
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath,
    args: ['--hidden']
  })
}

function checkForUpdates () {
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdates()

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
    setTimeout(() => autoUpdater.quitAndInstall(), 3000)
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err.message)
  })
}

async function initServices () {
  const username = store.get('username')

  services.discovery = new NetworkDiscovery(username)
  services.chat = new ChatService(username)
  services.fileTransfer = new FileTransfer(username)
  services.gameDetector = new GameDetector()
  services.systemMonitor = new SystemMonitor()
  services.achievements = new AchievementSystem(store)
  services.lobby = new LobbyManager(username)
  services.serverScanner = new ServerScanner()
  services.wol = new WakeOnLAN()
  services.gameServer = new GameServerManager()
  services.modpack = new ModpackSync()
  services.jukebox = new Jukebox(username)
  services.tournament = new Tournament()
  services.killswitch = new Killswitch()
  services.screenshots = new ScreenshotHub()
  services.netdiag = new NetDiag()
  services.timeTracker = new TimeTracker()

  services.discovery.on('peer-join', (peer) => { mainWindow?.webContents.send('peer-join', peer); services.achievements.unlock('first_connect') })
  services.discovery.on('peer-leave', (peer) => mainWindow?.webContents.send('peer-leave', peer))
  services.discovery.on('peer-update', (peer) => mainWindow?.webContents.send('peer-update', peer))
  services.chat.on('message', (msg) => mainWindow?.webContents.send('chat-message', msg))
  services.fileTransfer.on('progress', (data) => mainWindow?.webContents.send('file-progress', data))
  services.fileTransfer.on('complete', (data) => { mainWindow?.webContents.send('file-complete', data); services.achievements.unlock('transfer_500gb', data.size) })
  services.gameDetector.on('games-updated', (games) => mainWindow?.webContents.send('games-updated', games))
  services.lobby.on('lobby-update', (lobby) => mainWindow?.webContents.send('lobby-update', lobby))
  services.serverScanner.on('server-found', (server) => mainWindow?.webContents.send('server-found', server))
  services.screenshots.on('new-screenshot', (ss) => mainWindow?.webContents.send('new-screenshot', ss))
  services.timeTracker.on('game-started', (g) => mainWindow?.webContents.send('game-session-start', g))
  services.timeTracker.on('game-stopped', (g) => mainWindow?.webContents.send('game-session-end', g))

  await Promise.all([
    services.discovery.start(), services.chat.start(),
    services.fileTransfer.start(), services.gameDetector.start(),
    services.systemMonitor.start(), services.lobby.start(),
    services.serverScanner.start(), services.screenshots.start(),
    services.timeTracker.start(), services.jukebox.start()
  ])

  setInterval(async () => {
    const stats = await services.systemMonitor.getStats()
    mainWindow?.webContents.send('system-stats', stats)
  }, 2000)

  setInterval(() => {
    const hosts = services.discovery.getPeers()
    services.achievements.checkLobbyDuration(hosts)
  }, 60000)

  services.achievements.checkHostCount()
}

const gotSingleLock = app.requestSingleInstanceLock()
if (!gotSingleLock && !isDev) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

if (isWin) {
  app.setAsDefaultProtocolClient('retrolan')
} else if (isMac) {
  app.setAsDefaultProtocolClient('retrolan', process.execPath, ['--open-url'])
} else {
  app.setAsDefaultProtocolClient('retrolan')
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

function handleDeepLink (url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'join') {
      const lobbyId = parsed.searchParams.get('lobby')
      if (lobbyId && services.lobby) {
        mainWindow?.webContents.send('deep-link-join', lobbyId)
      }
    }
  } catch (e) { /* ignore */ }
}

app.on('window-all-closed', async () => {
  for (const s of Object.values(services)) { if (s?.stop) await s.stop() }
  if (!isMac) app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
  else mainWindow?.show()
})

app.whenReady().then(async () => {
  createWindow()
  createTray()
  await initServices()

  if (store.get('autoStart') && app.getLoginItemSettings().wasOpenedAsHidden) {
    mainWindow?.hide()
  }

  ipcMain.handle('get-peers', () => services.discovery.getPeers())
  ipcMain.handle('get-username', () => store.get('username'))
  ipcMain.handle('set-username', (_, name) => { store.set('username', name); services.discovery.setName(name) })
  ipcMain.handle('send-chat', (_, text) => services.chat.send(text))
  ipcMain.handle('send-file', (_, targetId, filePath) => services.fileTransfer.send(targetId, filePath))
  ipcMain.handle('cancel-transfer', (_, id) => services.fileTransfer.cancel(id))
  ipcMain.handle('get-games', () => services.gameDetector.getGames())
  ipcMain.handle('get-stats', () => services.systemMonitor.getStats())
  ipcMain.handle('get-achievements', () => services.achievements.getAll())
  ipcMain.handle('create-lobby', (_, name, games) => services.lobby.create(name, games))
  ipcMain.handle('join-lobby', (_, id) => services.lobby.join(id))
  ipcMain.handle('leave-lobby', () => services.lobby.leave())
  ipcMain.handle('get-lobbies', () => services.lobby.getLobbies())
  ipcMain.handle('get-network-map', () => services.discovery.getNetworkMap())
  ipcMain.handle('launch-game', (_, id) => services.gameDetector.launch(id))
  ipcMain.handle('join-server', (_, ip, port) => services.serverScanner.joinServer(ip, port))
  ipcMain.handle('wol-send', (_, ip) => services.wol.send(ip))
  ipcMain.handle('gs-list', () => services.gameServer.getServers())
  ipcMain.handle('gs-start', (_, id) => services.gameServer.start(id))
  ipcMain.handle('gs-stop', (_, id) => services.gameServer.stop(id))
  ipcMain.handle('gs-add', (_, name, exe, args) => services.gameServer.addCustom(name, exe, args))
  ipcMain.handle('modpack-list', () => services.modpack.getModpacks())
  ipcMain.handle('modpack-pack', (_, src) => services.modpack.packAndShare(src))
  ipcMain.handle('jukebox-queue', (_, fp) => services.jukebox.addTrack(fp))
  ipcMain.handle('jukebox-play', () => services.jukebox.startBroadcast())
  ipcMain.handle('jukebox-skip', () => services.jukebox.skip())
  ipcMain.handle('tournament-list', () => services.tournament.getTournaments())
  ipcMain.handle('tournament-create', (_, data) => services.tournament.create(data))
  ipcMain.handle('tournament-score', (_, tid, mid, s1, s2) => services.tournament.setScore(tid, mid, s1, s2))
  ipcMain.handle('killswitch-on', () => services.killswitch.enable())
  ipcMain.handle('killswitch-off', () => services.killswitch.disable())
  ipcMain.handle('killswitch-status', () => services.killswitch.getStatus())
  ipcMain.handle('screenshots-list', () => services.screenshots.getScreenshots())
  ipcMain.handle('screenshots-share', (_, fp) => services.screenshots.copyToShare(fp))
  ipcMain.handle('netdiag-ping', (_, ip) => services.netdiag.ping(ip))
  ipcMain.handle('netdiag-pingall', (_, ips) => services.netdiag.pingAll(ips))
  ipcMain.handle('netdiag-speedtest', (_, ip) => services.netdiag.speedTest(ip))
  ipcMain.handle('timetracker-stats', (_, game) => services.timeTracker.getStats(game))
  ipcMain.handle('minimize-window', () => mainWindow?.minimize())
  ipcMain.handle('maximize-window', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
  ipcMain.handle('close-window', () => mainWindow?.close())

  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('get-auto-start', () => store.get('autoStart'))
  ipcMain.handle('set-auto-start', (_, enable) => toggleAutoStart(enable))
  ipcMain.handle('get-minimize-to-tray', () => store.get('minimizeToTray'))
  ipcMain.handle('set-minimize-to-tray', (_, val) => store.set('minimizeToTray', val))
  ipcMain.handle('check-for-updates', () => { if (!isDev) checkForUpdates() })
  ipcMain.handle('download-update', () => { autoUpdater.downloadUpdate() })
  ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall() })
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url))
  ipcMain.handle('open-path', (_, p) => shell.openPath(p))
  ipcMain.handle('show-item-in-folder', (_, p) => shell.showItemInFolder(p))
})
