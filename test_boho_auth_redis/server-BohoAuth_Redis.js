import { RemoteServer, serverOption , BohoAuth_Redis } from 'remote-signal'
import { redisClient } from '../bin/redisClient.js';

let authManager = new BohoAuth_Redis( redisClient )
serverOption.showMessage = 'message';
const rs = new RemoteServer( serverOption ,authManager  )
console.log( 'serverOption:', serverOption )
