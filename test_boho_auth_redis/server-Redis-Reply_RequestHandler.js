import { RemoteServer, serverOption , RequestHandler , ReplyHandler ,RedisHandler} from 'remote-signal'
import { redisClient } from './redisClient.js';


let requestHander = new RequestHandler(new RedisHandler( null, redisClient), new ReplyHandler() )
serverOption.showMessage = 'message';

// no authManager
// testing simple sample 'RedisHandler' requestHandler
const rs = new RemoteServer( serverOption ,null ,requestHander )
console.log( 'serverOption:', serverOption )
