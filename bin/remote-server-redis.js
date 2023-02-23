#!/usr/bin/env node

import { RemoteServer, serverOption } from 'remote-signal'
import { AuthRedis } from '../src/AuthRedis.js';
import { program } from 'commander'
let authManager;

const version = '0.3.0'
program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-q, --quota', 'use Quota')
  .option('-m, --metric <type>', 'show metric <number> 1:oneline, 2: traffic 3:echo')
  .option('-s, --show-message <none|message|frame>', 'show receive message. ')
  .option('-p, --publish-address <url,ch>', 'publish local address to othe server.')
  .parse(process.argv)

const programOptions = program.opts()

console.log(programOptions)


if (programOptions.listen) {
  serverOption.port = programOptions.listen
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

authManager = new AuthRedis()

if (programOptions.showMessage) {
  serverOption.showMessage = programOptions.showMessage
}

if (programOptions.metric) {
  serverOption.showMetric = programOptions.metric
}

if (programOptions.timeout) {
  serverOption.timeout = programOptions.timeout
}

const remoteServer = new RemoteServer(serverOption, authManager)

console.log('ServerOptions:', serverOption)



