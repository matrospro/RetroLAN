const EventEmitter = require('events')
const dgram = require('dgram')
const fs = require('fs')
const path = require('path')

const JUKEBOX_PORT = 42074
const CHUNK_SIZE = 1400

class Jukebox extends EventEmitter {
  constructor (username) {
    super()
    this.username = username
    this.socket = null
    this.isDJ = false
    this.currentTrack = null
    this.playing = false
    this.queue = []
    this.tracks = new Map() // peer -> track info
  }
  start () {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.type === 'jukebox-track') {
          this.tracks.set(rinfo.address, data)
          this.emit('tracks-updated', Array.from(this.tracks.values()))
        }
      } catch (e) { /* ignore */ }
    })
    this.socket.bind(JUKEBOX_PORT, () => this.socket.setBroadcast(true))
  }
  addTrack (filePath) {
    const name = path.basename(filePath)
    this.queue.push({ name, filePath })
    return { ok: true, name }
  }
  startBroadcast () {
    this.isDJ = true
    if (this.queue.length === 0) return { ok: false, error: 'Nessun brano in coda' }
    const track = this.queue[0]
    this.currentTrack = track
    this.playing = true
    // Just announce the track - actual streaming uses file transfer
    const msg = JSON.stringify({ type: 'jukebox-track', from: this.username, track: track.name, status: 'playing' })
    this.socket.send(msg, 0, msg.length, JUKEBOX_PORT, '255.255.255.255')
    return { ok: true, track: track.name }
  }
  skip () {
    this.queue.shift()
    if (this.queue.length > 0) return this.startBroadcast()
    this.playing = false
    this.currentTrack = null
    return { ok: true, end: true }
  }
  playFromPeer (filePath) {
    return this.addTrack(filePath)
  }
  stop () { this.socket?.close() }
}
module.exports = { Jukebox }
