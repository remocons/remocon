import { BohoAuthRedis } from './BohoAuthRedis.js';

// node filename base_id level number
// node uno 1 100
let auth = new BohoAuthRedis()
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



