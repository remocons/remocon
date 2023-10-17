import { Auth_Redis } from 'remote-signal'
import { createClient  } from 'redis';

let redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

let auth = new Auth_Redis( redisClient)

// node filename base_id level number
// node uno 1 10
//addUSer(did,dey,cid,level)
let baseId = process.argv[2] ? process.argv[2] : 'uno'
let level = process.argv[3] ? process.argv[3] : 1;
let n = process.argv[4] ? process.argv[4] : 10;

console.log( baseId, n )
for(let i=0; i< n ;i++){
  let id = baseId + i;
  let addResult = await auth.addAuth( id, id, id ,level)
  console.log('add',addResult )
}

await auth.save();

process.exit()



