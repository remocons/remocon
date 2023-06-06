import { BohoAuthRedis } from '../boho_auth_redis/BohoAuthRedis.js';

let auth = new BohoAuthRedis()
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



