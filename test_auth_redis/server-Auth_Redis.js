import { Auth_Redis , serverOption , RemoteServer } from 'remote-signal'
import { createClient  } from 'redis';

let redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

let authManager = new Auth_Redis( redisClient)

serverOption.showMessage = 'message';
const remoteServer = new RemoteServer( serverOption ,authManager  )
console.log( 'serverOption:', serverOption )
