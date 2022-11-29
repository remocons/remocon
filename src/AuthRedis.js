import { AuthCore , sha256 } from 'remote-signal'
import { createClient ,commandOptions } from 'redis';

const HOST = 'localhost'
const PORT = 6379

export class AuthRedis extends AuthCore{
  constructor( url ){
    super();
    this.redis = createClient();
    this.redis.on('error', (err) => console.log('Redis Client Error', err));
    this.redis.connect();

  }


  // auth consumers
  async getAuthKey( id ){
    return this.redis.get( 
      commandOptions({ returnBuffers: true }),
      'AUTH:'+id);
  }


  async getInfo( id ){
    return this.redis.hGetAll('INFO:'+ id)
  }

  async getPublic( id ){
    return this.redis.hGetAll('PUBLIC:'+ id)
  }

// auth info generators

  async addAuth( id, keyStr , cid = '' ){

    let hashKey = Buffer.from( sha256.hash(keyStr))
  
    let authResult = await this.redis.set( 'AUTH:' + id,  hashKey  )
    let infoResult = await this.redis.hSet( 'INFO:' + id, { 'cid': cid } )
  
    console.log('add authResult, infoResult ', authResult, infoResult )
  
  }

  async setPublic( id, infoObj = {} ){
    await this.redis.hSet( 'PUBLIC:' + id, infoObj )
  }



}

