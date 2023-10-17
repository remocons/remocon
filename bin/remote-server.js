#!/usr/bin/env node

import { RemoteServer, serverOption, Auth_File, Auth_Redis,
  api_reply ,api_sudo , RedisAPI
} from 'remote-signal'
import { createClient  } from 'redis';
import { program } from 'commander'
import { version } from './getVersion.js'

program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-L, --listen-congport <port>', 'listen on cong port (start CongSocket Server)')
  .option('-d, --auth-file <path>', 'auth data file path')
  .option('-r, --auth-redis', 'connect to redis. if exist use env REDIS_HOST, REDIS_PORT or localhost:6379')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
  .option('-s, --show-message <none|message|frame>', 'show receive message. ')
  .option('-f, --file-logger', 'write log files.')
  .option('-a, --api-list [list...]', 'one or multiple api names:  -a api_1 api_2 ')
  .option('-o, --show-options', 'show server init options.')
  .parse(process.argv)

const options = program.opts()


if (options.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

if (options.listen) {
  serverOption.port = options.listen
}

if (options.listenCongport) {
  serverOption.congPort = parseInt( options.listenCongport )
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


let authManager;
let redisClient;

if(options.authFile ){
  console.log("auth data origin: auth_file")
  let authFilePath = options.authFile;
  authManager = new Auth_File( authFilePath)
}else if(options.authRedis ){
  console.log("auth data origin: redis")
  // console.log('####### default redis server url: redis://localhost:6379 ' )   
  redisClient = createClient();
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();
  authManager = new Auth_Redis( redisClient )
}else{
  console.log("No authentication support.")

}


const remoteServer = new RemoteServer(serverOption, authManager)

if( options.apiList && options.apiList.length > 0  ){
  let apiList = options.apiList
  console.log('api list', apiList)
  if( apiList.includes('reply')) remoteServer.api( 'reply', api_reply )
  if( apiList.includes('sudo')) remoteServer.api( 'sudo', api_sudo )
  if( apiList.includes('redis')) remoteServer.api( 'redis', new RedisAPI( redisClient ) )
  
}

if( options.showOptions ){
  console.log('ServerOptions:', serverOption)
  console.log('server api list', remoteServer.apiNames )
}



