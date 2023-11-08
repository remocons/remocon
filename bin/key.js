#!/usr/bin/env node

import { RAND } from 'remote-signal'


// base64 from random n-byte 
function rand_b64(srcByteSize) {
    return RAND(srcByteSize).toString('base64')
}

// accept 1 ~ 12
function rand_number_string(len) {
    if (len > 12) throw new RangeError("Member: rand_number range is over.")

    let bigNumberBuffer, n, nString;
    const cropFrom = 1;
    do {
      bigNumberBuffer = RAND(8);
      n = bigNumberBuffer.readBigUInt64LE(0);
      nString = n.toString()
      // console.log('>', n )
    } while ((n < 2 ** 44) || nString[cropFrom] == '0')  // 44-> 14digit.

    nString = nString.substring(cropFrom, len + cropFrom)
    return nString
  }



  
  let key20 =  rand_b64(15)
  let did4 =  rand_b64(3)
  let did8 =  rand_b64(6)
let randNumber4 = rand_number_string(4)
let randNumber8 = rand_number_string(8)
// console.log('rand number 8chars', rand_number_string(8) )
// console.log('random 15bytes as base64 20chars: ', key )
// console.log('random 3bytes as base64 4chars: ', did )

console.log('\n random values')
console.log('+------------------------------------+')
console.log('| ID:', did4  ,' KEY:', key20 )
console.log('+------------------------------------+')
console.log('| ID_KEY: ', did4 + '.' + key20 )
console.log('+------------------------------------+')
console.log('| numbers: ', randNumber4 , randNumber8 )
console.log('+------------------------------------+')
console.log('')
