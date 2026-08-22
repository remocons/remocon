#!/usr/bin/env node

import { IO } from 'iosignal'

console.log( process.argv )


if( process.argv.length > 2 ){
  
  let args = process.argv.slice(2)
  // let tag = process.argv[2]
  // let payload = process.argv[3]
  console.log('args', args )

  const url = 'wss://io.remocon.kr/ws';
  let io = new IO(url)
  
  
  io.on('ready', () => {
    console.log( 'ready cid ', io.cid)
    
    io.signal( ...args )
    setTimeout(() => {
      io.close();
      process.exit();
    }, 100);
  })


}  






