const EventEmitter = require('events')
const dgram = require('dgram')

const CHAT_PORT = 42070

class ChatService extends EventEmitter {
  constructor (username) {
    super()
    this.username = username
    this.socket = null
    this.messages = []
  }

  start () {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString())
          if (data.type === 'chat-msg') {
            const message = {
              id: `${Date.now()}-${Math.random()}`,
              from: data.from,
              text: data.text,
              time: data.time || Date.now(),
              ip: rinfo.address
            }
            this.messages.push(message)
            this.emit('message', message)
          }
        } catch (e) { /* ignore */ }
      })

      this.socket.on('listening', () => {
        this.socket.setBroadcast(true)
        resolve()
      })

      this.socket.bind(CHAT_PORT)
    })
  }

  send (text) {
    const msg = JSON.stringify({
      type: 'chat-msg',
      from: this.username,
      text,
      time: Date.now()
    })
    this.socket.send(msg, 0, msg.length, CHAT_PORT, '255.255.255.255')
    const localMsg = {
      id: `${Date.now()}-local`,
      from: this.username,
      text,
      time: Date.now()
    }
    this.messages.push(localMsg)
    this.emit('message', localMsg)
  }

  stop () {
    this.socket?.close()
  }
}

module.exports = { ChatService }
