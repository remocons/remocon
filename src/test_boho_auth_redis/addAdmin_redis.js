import { BohoAuthRedis } from './BohoAuthRedis.js';

let auth = new BohoAuthRedis()
  //addUSer(did,dkey,cid,level)
  if( process.argv.length != 5 ){
    console.log('=> $ node addAdmin.js id key cid')
    process.exit()
  }

  let did = process.argv[2] 
  let dkey = process.argv[3]
  let cid = process.argv[4] 

    let addResult = await auth.addAuth( did, dkey, cid ,255)
    let getResult = await auth.getAuth( did )
    let saveResult = await auth.save();

    console.log('add',addResult )
    console.log('get',getResult)
    console.log('data.key',getResult.key)
    console.log('save result', saveResult)

    process.exit()



