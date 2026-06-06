# 🎮 RetroLAN — LAN Party Hub

**RetroLAN** è un'applicazione Electron per organizzare **LAN Party** su rete locale. Scopri PC connessi, chatta, condividi file, avvia server di gioco e molto altro — tutto senza internet.

![RetroLAN screenshot]()

## ✨ Funzionalità

| Modulo               | Descrizione |
|----------------------|-------------|
| 💻 **Discovery**     | Trova automaticamente i PC nella stessa LAN |
| 💬 **Chat**          | Messaggistica broadcast su UDP |
| 📁 **File Transfer** | Invia file alla velocità della LAN (TCP) |
| 🎮 **Game Detector** | Rileva giochi Steam/Minecraft installati |
| 📊 **System Monitor**| CPU, RAM, disco, rete in tempo reale |
| 🏠 **Lobby**         | Stanze virtuali per organizzare le partite |
| 🌐 **Server Scanner**| Scansiona la LAN per server di gioco aperti |
| 🔌 **Wake-on-LAN**   | Accendi PC spenti nella rete |
| ⚡ **Game Server**    | Avvia/ferma server Minecraft, Terraria e altri |
| 📦 **Modpack Sync**  | Condividi modpack zippati sulla LAN |
| 🎵 **Jukebox**       | Trasmetti musica a tutti i PC |
| 🏆 **Tornei**        | Crea bracket e segna punteggi |
| 🖼️ **Screenshot Hub**| Galleria condivisa di screenshot |
| 📡 **NetDiag**       | Ping, speed test e diagnostica di rete |
| ⏱️ **Time Tracker**  | Monitora le ore di gioco |
| 🔒 **Killswitch**    | Blocca internet, lascia attiva solo la LAN |
| 🗺️ **Mappa di Rete** | Visualizza topologia della LAN |
| 🏆 **Achievement**   | Sblocca obiettivi LAN |

## 🖥️ Cross-platform

Windows (x64/ia32), macOS (Intel/Apple Silicon), Linux (x64).

## 🚀 Come iniziare

### Prerequisiti
- [Node.js](https://nodejs.org) 18+

### Avvio rapido

```bash
# Clona il repo
git clone https://github.com/matrospro/RetroLAN.git
cd RetroLAN

# Installa dipendenze
npm install

# Avvia
npm start
```

Oppure usa direttamente `start.bat` (Windows) o `start.sh` (macOS/Linux).

### Build per distribuzione

```bash
npm run build:win    # Windows (NSIS installer + portable)
npm run build:mac    # macOS (DMG + ZIP)
npm run build:linux  # Linux (AppImage + deb)
npm run build        # tutti i target
```

I file finiscono in `dist/`.

## 🛠️ Stack

- **Electron 42** — cross-platform desktop
- **electron-builder** — packaging e distribuzione
- **electron-updater** — aggiornamenti automatici
- **systeminformation** — monitoraggio hardware
- **electron-store** — salvataggio configurazioni

## 📜 Licenza

MIT
