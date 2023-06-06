#!/usr/bin/env node

import { RemoteServer, serverOption , BohoAuth ,RequestHandler, ReplyHandler  } from 'remote-signal'
import { BohoAuthRedis } from '../src/boho_auth_redis/BohoAuthRedis.js'
import { RedisHandler } from '../src/req_handlers/RedisHandler.js'
import { program } from 'commander'
import { version } from '../getVersion.js'

program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-L, --listen-congport <port>', 'listen on cong port (start CongSocket Server)')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-q, --quota', 'use Quota')
  .option('-m, --metric <type>', 'show metric <number> 1:oneline, 2: traffic 3:echo')
  .option('-s, --show-message <none|message|frame>', 'show receive message. ')
  .option('-p, --publish-address <url,ch>', 'publish local address to othe server.')
  .option('-f, --file-logger', 'write log files.')
  .parse(process.argv)

const programOptions = program.opts()

console.log(programOptions)

if (programOptions.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

if (programOptions.listen) {
  serverOption.port = parseInt( programOptions.listen )
}

if (programOptions.listenCongport) {
  serverOption.congPort = parseInt( programOptions.listenCongport )
}

if (programOptions.quota) {
  serverOption.useQuota = {
    signalSize: true,
    publishCounter: true,
    trafficRate: true,
    disconnect: true
  }
}

if( programOptions.publishAddress ){
  let url = programOptions.publishAddress.split(',')[0]
  let ch = programOptions.publishAddress.split(',')[1]
  if( url && ch ){
    serverOption.publishLocalAddress = {
      use: true,
      url: url,
      ch: ch
    }
  }else{
    console.log('[ use url(comma)ch ]  -p wss://url,channel ')
  }
}


if (programOptions.showMessage) {
  serverOption.showMessage = programOptions.showMessage
}

if (programOptions.metric) {
  serverOption.showMetric = programOptions.metric
}

if (programOptions.timeout) {
  serverOption.timeout = programOptions.timeout
}

let authManager = new BohoAuth( new BohoAuthRedis() )
let reqHandler = new RequestHandler( new ReplyHandler(), new RedisHandler() )
const remoteServer = new RemoteServer(serverOption, authManager, reqHandler)

console.log('ServerOptions:', serverOption)



