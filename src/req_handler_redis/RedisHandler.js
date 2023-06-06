import { redisClient as redis } from '../boho_auth_redis/redisClient.js';

export class RedisHandler{
  constructor( name ){
    this.name = 'redis'
    if( name ){
      this.name = name
    }
  }

  async request(remote, req ){
    if( !remote.isAdmin ){
      remote.response( req.mid , 255 , "NO PERMISSION" )
      return
    }
    let result = "no result";
    let status = 0;// *0~127: ok ,  128~*255 :error
    try {
      console.log(req)
      let cmd = req.topic
      if(cmd == 'set'){
        result = await redis.set( ...req.$ )
      }else if(cmd == 'get'){
        result = await redis.get( ...req.$ )
      }else if(cmd == 'hset'){
        result = await redis.hSet( ...req.$ )
      }else if(cmd == 'hget'){
        result = await redis.hGet( ...req.$ )
      }else if(cmd == 'hgetall'){
        result = await redis.hGetAll(  ...req.$ )
      }else{
        result = 'req_redis: no such a cmd '+ cmd;
        status = 255;
      }

      // let mbp = MBP.pack(MBP.MB('result', result));
      remote.response( req.mid, status , result)
    } catch (e) {
      // remote.response( mid, 255, error )
      // console.error( e)
      remote.response( req.mid, 255 ,e.message )
    }

  }

}

  
  

