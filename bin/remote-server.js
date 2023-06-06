#!/usr/bin/env node

import { RemoteServer, serverOption, BohoAuth, BohoAuthFileDB } from 'remote-signal'
import { program } from 'commander'
import { version } from '../getVersion.js'

let authManager;

program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-L, --listen-congport <port>', 'listen on cong port (start CongSocket Server)')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-d, --data-base <file>', 'load user data from file')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
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
  serverOption.port = programOptions.listen
}

if (programOptions.listenCongport) {
  serverOption.congPort = parseInt( programOptions.listenCongport )
}


if (programOptions.dataBase) {
  let authFilePath = programOptions.dataBase;

  authManager = new BohoAuth( new BohoAuthFileDB( authFilePath) )
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


const remoteServer = new RemoteServer(serverOption, authManager)

console.log('ServerOptions:', serverOption)



