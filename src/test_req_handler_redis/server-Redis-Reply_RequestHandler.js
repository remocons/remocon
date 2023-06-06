import { RemoteServer, serverOption , RequestHandler , ReplyHandler} from 'remote-signal'
import { RedisHandler } from '../req_handler_redis/RedisHandler.js'

let requestHander = new RequestHandler(new RedisHandler(), new ReplyHandler() )
serverOption.showMessage = 'message';

// no authManager
// testing simple sample 'RedisHandler' requestHandler
const rs = new RemoteServer( serverOption ,null ,requestHander )
console.log( 'serverOption:', serverOption )
