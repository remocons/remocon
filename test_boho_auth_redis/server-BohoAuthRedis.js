import { RemoteServer, serverOption, BohoAuth , BohoAuthRedis } from 'remote-signal'
import { redisClient } from './redisClient.js';

let authManager = new BohoAuth( new BohoAuthRedis( redisClient ) )
serverOption.showMessage = 'message';
const rs = new RemoteServer( serverOption ,authManager  )
console.log( 'serverOption:', serverOption )
