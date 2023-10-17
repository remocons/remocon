import { Auth_Redis } from 'remote-signal'
import { createClient  } from 'redis';

let redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

let auth = new Auth_Redis( redisClient)

//addUSer(did,dey,cid,level)
let addResult = await auth.addAuth('uno','uno','uno',1)
let getResult = await auth.getAuth('uno')
let wrongResult = await auth.getAuth('noid')

console.log('add',addResult )
console.log('get',getResult)
console.log('data.key',getResult.key)
console.log('wrongResult',wrongResult)
console.log('wrongResult.key',wrongResult?.key)

process.exit()



