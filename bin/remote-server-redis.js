#!/usr/bin/env node

import { RemoteServer, serverOption ,BohoAuth_Redis} from 'remote-signal'
import { redisClient } from './redisClient.js';
import { program } from 'commander'
import { version } from './getVersion.js'

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

const options = program.opts()

console.log(options)

if (options.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

if (options.listen) {
  serverOption.port = parseInt( options.listen )
}

if (options.listenCongport) {
  serverOption.congPort = parseInt( options.listenCongport )
}

if (options.quota) {
  serverOption.useQuota = {
    signalSize: true,
    publishCounter: true,
    trafficRate: true,
    disconnect: true
  }
}

if( options.publishAddress ){
  let url = options.publishAddress.split(',')[0]
  let ch = options.publishAddress.split(',')[1]
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


if (options.showMessage) {
  serverOption.showMessage = options.showMessage
}

if (options.metric) {
  serverOption.showMetric = options.metric
}

if (options.timeout) {
  serverOption.timeout = options.timeout
}

let authManager = new BohoAuth_Redis( redisClient)
const remoteServer = new RemoteServer(serverOption, authManager)

console.log('ServerOptions:', serverOption)



