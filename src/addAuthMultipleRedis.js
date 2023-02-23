import {  AuthRedis } from './AuthRedis.js'

let auth = new AuthRedis()
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
    // let getResult = await auth.getAuth('uno')
    // let wrongResult = await auth.getAuth('noid')

    // console.log('get',getResult)
    // console.log('data.key',getResult.key)
    // console.log('wrongResult',wrongResult)
    // console.log('wrongResult.key',wrongResult?.key)

    await auth.redis.save();

    process.exit()



