const EventEmitter = require('events')
const net = require('net')
const fs = require('fs')
const path = require('path')
const os = require('os')

const TRANSFER_PORT = 42071

class FileTransfer extends EventEmitter {
  constructor (username) {
    super()
    this.username = username
    this.transfers = new Map()
    this.server = null
  }

  start () {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        const transferId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        let fileName = ''
        let fileSize = 0
        let received = 0
        let fileStream = null
        let headerParsed = false
        let headerBuffer = Buffer.alloc(0)

        socket.on('data', (data) => {
          if (!headerParsed) {
            headerBuffer = Buffer.concat([headerBuffer, data])
            const headerEnd = headerBuffer.indexOf('\n')
            if (headerEnd !== -1) {
              const header = JSON.parse(headerBuffer.slice(0, headerEnd).toString())
              fileName = header.name
              fileSize = header.size
              received = 0
              headerParsed = true
              const savePath = path.join(os.tmpdir(), 'retrolan', fileName)
              fs.mkdirSync(path.dirname(savePath), { recursive: true })
              fileStream = fs.createWriteStream(savePath)
              headerBuffer = headerBuffer.slice(headerEnd + 1)
              if (headerBuffer.length > 0) {
                fileStream.write(headerBuffer)
                received += headerBuffer.length
              }
              this.transfers.set(transferId, { fileName, fileSize, received, savePath })
            }
          } else if (fileStream) {
            fileStream.write(data)
            received += data.length
            this.transfers.get(transferId).received = received
            this.emit('progress', { transferId, fileName, received, fileSize, progress: (received / fileSize) * 100 })
          }
        })

        socket.on('end', () => {
          if (fileStream) fileStream.end()
          if (fileStream && received >= fileSize) {
            this.emit('complete', { transferId, fileName, fileSize, savePath: this.transfers.get(transferId)?.savePath })
          }
        })
      })

      this.server.listen(TRANSFER_PORT, resolve)
    })
  }

  send (targetIp, filePath) {
    const client = new net.Socket()
    const fileName = path.basename(filePath)
    const fileSize = fs.statSync(filePath).size
    const header = JSON.stringify({ name: fileName, size: fileSize }) + '\n'

    client.connect(TRANSFER_PORT, targetIp, () => {
      client.write(header)
      const stream = fs.createReadStream(filePath)
      stream.pipe(client)
    })
  }

  cancel (transferId) {
    const transfer = this.transfers.get(transferId)
    // cleanup
  }

  stop () {
    this.server?.close()
  }
}

module.exports = { FileTransfer }
