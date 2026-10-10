import { app } from './app'
import { pool } from './config/db'
const port = Number(process.env.PORT || 4000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
const server = app.listen(port, () => console.log('JLPT API listening on port ' + port))
server.requestTimeout = 30000
server.headersTimeout = 35000
server.keepAliveTimeout = 5000
server.maxRequestsPerSocket = 1000
let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(() => { pool.end().then(() => { process.exitCode = 0 }) })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
