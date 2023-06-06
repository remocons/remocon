import { RemoteServer, serverOption, BohoAuth  } from 'remote-signal'
import { BohoAuthRedis } from '../boho_auth_redis/BohoAuthRedis.js';

let authManager = new BohoAuth( new BohoAuthRedis() )
serverOption.showMessage = 'message';
const rs = new RemoteServer( serverOption ,authManager  )
console.log( 'serverOption:', serverOption )
