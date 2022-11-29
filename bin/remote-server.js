#!/usr/bin/env node

import { 
  RemoteServer, RemoteOptions, 
  WS_PORT , AuthFile 
 } from 'remote-signal'

import { program } from 'commander'

const DEFAULT_AUTH_FILE = 'authinfo.json'
let authManager;

const version = '0.2.0'
program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-d, --data-base <file>', 'load user data from file')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
  .option('-s, --show-message <none|message|frame>', 'show receive message. ')
  .parse(process.argv)

const programOptions = program.opts()

console.log( programOptions )


if ( !programOptions.listen) {
  programOptions.listen = WS_PORT
}

if (programOptions.listen) {

  if (programOptions.dataBase) {

    let authFilePath = programOptions.dataBase;
    authManager = new AuthFile( authFilePath)
    
  }else{ // no authManager
      // authManager = new AuthFile( DEFAULT_AUTH_FILE )
  }

  if (programOptions.showMessage) {
    RemoteOptions.showMessage = programOptions.showMessage
  }
  
  if (programOptions.metric) {
    RemoteOptions.showMetric = programOptions.metric
  }

  if( programOptions.adminChannel){
    RemoteOptions.adminChannel = programOptions.adminChannel
  }
  
  let timeout =  programOptions.timeout ?  programOptions.timeout : 50000 ; //50sec
  
  const remoteServer = new RemoteServer({
    port: programOptions.listen
    ,timeout : timeout
  }, authManager )
  
  console.log( 'Remote CLI Options', RemoteOptions )

} else {
  program.help()
}


