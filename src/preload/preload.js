const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('retroLAN', {
  getPeers: () => ipcRenderer.invoke('get-peers'),
  getNetworkMap: () => ipcRenderer.invoke('get-network-map'),
  getUsername: () => ipcRenderer.invoke('get-username'),
  setUsername: (n) => ipcRenderer.invoke('set-username', n),
  // Chat
  sendChat: (t) => ipcRenderer.invoke('send-chat', t),
  onChatMessage: (cb) => ipcRenderer.on('chat-message', (_, m) => cb(m)),
  // File
  sendFile: (t, p) => ipcRenderer.invoke('send-file', t, p),
  onFileProgress: (cb) => ipcRenderer.on('file-progress', (_, d) => cb(d)),
  onFileComplete: (cb) => ipcRenderer.on('file-complete', (_, d) => cb(d)),
  // Games
  getGames: () => ipcRenderer.invoke('get-games'),
  launchGame: (id) => ipcRenderer.invoke('launch-game', id),
  onGamesUpdated: (cb) => ipcRenderer.on('games-updated', (_, g) => cb(g)),
  // Stats
  getStats: () => ipcRenderer.invoke('get-stats'),
  onSystemStats: (cb) => ipcRenderer.on('system-stats', (_, s) => cb(s)),
  // Achievements
  getAchievements: () => ipcRenderer.invoke('get-achievements'),
  // Lobby
  createLobby: (n, g) => ipcRenderer.invoke('create-lobby', n, g),
  joinLobby: (id) => ipcRenderer.invoke('join-lobby', id),
  leaveLobby: () => ipcRenderer.invoke('leave-lobby'),
  getLobbies: () => ipcRenderer.invoke('get-lobbies'),
  onLobbyUpdate: (cb) => ipcRenderer.on('lobby-update', (_, l) => cb(l)),
  // Network events
  onPeerJoin: (cb) => ipcRenderer.on('peer-join', (_, p) => cb(p)),
  onPeerLeave: (cb) => ipcRenderer.on('peer-leave', (_, p) => cb(p)),
  onPeerUpdate: (cb) => ipcRenderer.on('peer-update', (_, p) => cb(p)),
  // Server scanner
  onServerFound: (cb) => ipcRenderer.on('server-found', (_, s) => cb(s)),
  joinServer: (ip, port) => ipcRenderer.invoke('join-server', ip, port),
  // Wake-on-LAN
  wolSend: (ip) => ipcRenderer.invoke('wol-send', ip),
  // Game Server Manager
  gsList: () => ipcRenderer.invoke('gs-list'),
  gsStart: (id) => ipcRenderer.invoke('gs-start', id),
  gsStop: (id) => ipcRenderer.invoke('gs-stop', id),
  gsAdd: (n, e, a) => ipcRenderer.invoke('gs-add', n, e, a),
  // Modpack Sync
  modpackList: () => ipcRenderer.invoke('modpack-list'),
  modpackPack: (src) => ipcRenderer.invoke('modpack-pack', src),
  // Jukebox
  jukeboxQueue: (fp) => ipcRenderer.invoke('jukebox-queue', fp),
  jukeboxPlay: () => ipcRenderer.invoke('jukebox-play'),
  jukeboxSkip: () => ipcRenderer.invoke('jukebox-skip'),
  // Tournament
  tournamentList: () => ipcRenderer.invoke('tournament-list'),
  tournamentCreate: (d) => ipcRenderer.invoke('tournament-create', d),
  tournamentScore: (tid, mid, s1, s2) => ipcRenderer.invoke('tournament-score', tid, mid, s1, s2),
  // Killswitch
  killswitchOn: () => ipcRenderer.invoke('killswitch-on'),
  killswitchOff: () => ipcRenderer.invoke('killswitch-off'),
  killswitchStatus: () => ipcRenderer.invoke('killswitch-status'),
  // Screenshots
  screenshotsList: () => ipcRenderer.invoke('screenshots-list'),
  screenshotsShare: (fp) => ipcRenderer.invoke('screenshots-share', fp),
  onNewScreenshot: (cb) => ipcRenderer.on('new-screenshot', (_, s) => cb(s)),
  // NetDiag
  netdiagPing: (ip) => ipcRenderer.invoke('netdiag-ping', ip),
  netdiagPingAll: (ips) => ipcRenderer.invoke('netdiag-pingall', ips),
  netdiagSpeedtest: (ip) => ipcRenderer.invoke('netdiag-speedtest', ip),
  // TimeTracker
  timetrackerStats: (g) => ipcRenderer.invoke('timetracker-stats', g),
  onGameSessionStart: (cb) => ipcRenderer.on('game-session-start', (_, g) => cb(g)),
  onGameSessionEnd: (cb) => ipcRenderer.on('game-session-end', (_, g) => cb(g)),
  // App / Auto-start / Updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (e) => ipcRenderer.invoke('set-auto-start', e),
  getMinimizeToTray: () => ipcRenderer.invoke('get-minimize-to-tray'),
  setMinimizeToTray: (v) => ipcRenderer.invoke('set-minimize-to-tray', v),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, i) => cb(i)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', () => cb()),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_, e) => cb(e)),
  onDeepLinkJoin: (cb) => ipcRenderer.on('deep-link-join', (_, id) => cb(id)),
  // Shell
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  showItemInFolder: (p) => ipcRenderer.invoke('show-item-in-folder', p),
  // Window
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window')
})
