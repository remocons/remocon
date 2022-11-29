#!/usr/bin/env node

import { Remote, RemoteCongTCP, ENC_MODE , WS_PORT  } from 'remote-signal'
import { EventEmitter } from 'events'
import readline from 'readline'
import tty from 'tty'
import { program } from 'commander'

 class Console extends EventEmitter {
  constructor () {
    super()

    this.showIncommingMessage = true
    this.stdin = process.stdin
    this.stdout = process.stdout
    this.stderr = process.stderr

    this.readlineInterface = readline.createInterface(this.stdin, this.stdout)

    this.readlineInterface
      .on('line', (data) => {
        this.emit('line', data)
      })
      .on('close', () => {
        this.emit('close')
      })

    this._resetInput = () => {
      this.clear()
    }
  }

  static get Colors () {
    return {
      Red: '\u001b[31m',
      Green: '\u001b[32m',
      Yellow: '\u001b[33m',
      Blue: '\u001b[34m',
      Default: '\u001b[39m'
    }
  }

  static get Types () {
    return {
      Incoming: '< ',
      Control: '',
      Error: 'error: ',
      Put: '.'
    }
  }

  prompt () {
    this.readlineInterface.prompt(true)
  }

  print (type, msg, color) {
    if (tty.isatty(1)) {
      this.clear()

      // if (programOptions.execute) color = type = '';
      // else if (!programOptions.color) color = '';

      this.stdout.write(color + type + msg + Console.Colors.Default + '\n')
      this.prompt()
    } else if (type === Console.Types.Incoming) {
      this.stdout.write(msg + '\n')
    } else if (type === Console.Types.Error) {
      this.stderr.write(type + msg + '\n')
    } else if (type === Console.Types.Put) {
      // this.stdout.write( '.' )
    } else {
      // is a control message and we're not in a tty... drop it.
    }
  }

  clear () {
    if (tty.isatty(1)) {
      this.stdout.write('\r\u001b[2K\u001b[3D')
    }
  }

  pause () {
    this.stdin.on('keypress', this._resetInput)
  }

  resume () {
    this.stdin.removeListener('keypress', this._resetInput)
  }
}

function noop () {}

const version = '0.2.0'
program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-d, --data-base <file>', 'load user data from file')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
  .option('-s, --show-message <none|message|frame>', 'show receive message. ')
  .option('-a, --admin-channel <channelName>', 'admin channel name')
  .option('-c, --connect <url>', 'connect to a WebSocket server')
  .option('-i, --id <id>', 'userId')
  .option('-k, --key <key>', 'userKey')
  .option('-j, --join-channel <channelName>', 'join to channel')
  .option('-n, --nick <nickName>', 'use nick name')
  .option('-p, --ping', 'show ping pong')
  .parse(process.argv)

const programOptions = program.opts()



console.log( programOptions )


if ( !programOptions.connect) {  
  programOptions.connect = 'localhost:'+ WS_PORT
}

if (programOptions.connect) {  
  const wsConsole = new Console()

  let connectUrl = programOptions.connect
  // console.log('connectUrl raw', connectUrl )
  
  let remocon;
  let defaultChannel = '#screen'

  if( connectUrl.indexOf('tcp') === 0 ){
    //use TCP connection
     remocon = new RemoteCongTCP(connectUrl)
  }else{ // ws connection
    if (!connectUrl.match(/\w+:\/\/.*$/i)) {
      connectUrl = `ws://${connectUrl}`
    }
     remocon = new Remote(connectUrl)
  }

  remocon.listen('@', (...args)=>{
    console.log('rcv @', args)
  })

  if (programOptions.joinChannel) {
    console.log('options joinchannel', programOptions.joinChannel)
    remocon.channels.add( programOptions.joinChannel )

  }

  if (programOptions.nick) {
    remocon.nick = programOptions.nick
  }




  wsConsole.print(Console.Types.Control, `Connecting to ${connectUrl}`, Console.Colors.Yellow)

  remocon.on('@pong', (...data)=>{
    wsConsole.print( 
      Console.Types.Control, 
      `>> receive pong from ${ data[0] }`,
       Console.Colors.Yellow )
  })

  remocon.on('ready', () => {
    // 
    // if (programOptions.id && programOptions.key && !remocon.boho.isAuthorized) {
    //   remocon.login( programOptions.id ,programOptions.key )
    // }
    wsConsole.print(
      Console.Types.Control,
      'Remote::Ready (press CTRL+C to quit)',
      Console.Colors.Green )
  })

  remocon.on('close', () => {
    wsConsole.print(Console.Types.Control, `connection closed: `, Console.Colors.Yellow)
  })

  
  remocon.on('authorized', () => {
    wsConsole.print( 
      Console.Types.Control, 
      `AUTHORIZED. TLS: ${remocon.TLS}`,
       Console.Colors.Yellow )
  })


  remocon.on('message', (data , isBinary) => {
    
    let moreBytesIndicator = ""
    if ( isBinary ) {
        let buffer 
        const displayBufferLimit = 20
      if(data.byteLength > displayBufferLimit){
        buffer = Buffer.from(data ,0,displayBufferLimit);
        moreBytesIndicator = "..."
      }else{
        buffer = Buffer.from(data );
      }
    
      let prn = `${ buffer.toString('hex') }${moreBytesIndicator} [${data.byteLength} bytes total]`;
      if( wsConsole.showIncommingMessage ) wsConsole.print(Console.Types.Incoming, `rx: bin [hex] ${prn}`, Console.Colors.Green)

    }else{ 
      if( wsConsole.showIncommingMessage ) wsConsole.print(Console.Types.Incoming, `rx: text: ${data}`, Console.Colors.Green)
    }
  })

  // to send frame message.
  wsConsole.on('line', (data) => {
    if (data[0] === '.') {
      const toks = data.split(/\s+/)
      const cmd = toks[0].substring(1)
      let ch  = ""
      switch (cmd) {
        case 'login':
          remocon.login(toks[1], toks[2])
          break;
        case 'auth':
          remocon.auth(toks[1], toks[2])
          break;
        case 'encNo':
          remocon.encMode = ENC_MODE.NO 
          wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[ remocon.encMode ] }`, Console.Colors.Green)
          break;
        case 'encYes':
          remocon.encMode = ENC_MODE.YES
          wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[ remocon.encMode ] }`, Console.Colors.Green)
          break;
        case 'encAuto':
          remocon.encMode = ENC_MODE.AUTO
          wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[ remocon.encMode ] }`, Console.Colors.Green)
          break;
        case 'encMode':
          wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[ remocon.encMode ] }`, Console.Colors.Green)
          break;
        case 'hex':
          if(toks[1]){
            let buf = Buffer.from( toks[1] ,'hex')
            remocon.send_enc_mode( buf )
          }
          break;

        case 'pub_ch_hex':
          if(toks[2]){
            let buf = Buffer.from( toks[2] ,'hex')
            remocon.signal( toks[1],buf)
          }
          break;
        case 'echo':
          remocon.echo( toks[1])
          break;
        // case 'loop':  
        //   remocon.loop( toks[1])
        //   break;
        case 'iam':
          remocon.iam( toks[1])
          break;

        case 'id':
          console.log(`cid: ${ remocon.cid}  ssid: ${remocon.ssid }` )
          break;

        case 'ch':
          let chList = []
          remocon.channels.forEach( v=>{
            chList.push( v )
          })
          console.log(`channels: ${ chList.toString() }` )
          break;

          
        case 'listen':
          toks.shift()
          let tag = toks[0]
          console.log('listen tag', tag)
            remocon.listen( tag , (...args)=>{
              console.log(`listen:  target: ${tag} args:`, args )
              
            })
            remocon.subscribe_memory_channels()
            break;


        case 'sig':
        case 'signal':
            toks.shift()
            console.log('signal toks', toks )
            remocon.signal( ...toks )
          break;

        case 'sig_bin':
            toks.shift()
            let to = toks[0]
            let size = parseInt( toks[1])
            console.log('signal to, buffer size:', to, size)
            remocon.signal( to, new Uint8Array(size ))
          break;

        case 'pub':
        case 'publish':
            toks.shift()
            remocon.publish( ...toks )
          break;
        
        case 'set':
            remocon.set( toks[1] )
          break;
          
        case 'req':
        case 'request':
            remocon.request( toks[1] ).then( result=>{
              console.log('>> response:', result )
            })
          break;

        case 'join':
        case 'sub':
        case 'subscribe':
          toks.shift()
          remocon.subscribe( ...toks )
          break;
                
        case 'unsub':
          remocon.unsubscribe(toks[1]);
          break;

        case 'pping':
            remocon.signal( toks[1] + "@ping", remocon.cid )
          break;
        case 'ping':
          if(toks[1]){
            remocon.ws?.ping(toks[1])
          }else{
            remocon.ws?.ping(noop)
          }
          break;

        case 'pong':
          remocon.ws?.pong(noop)
          break

        case 'close': 
          remocon.close()
          break

        case 'open':
        case 'connect': 
          if(toks[1]){
            let url = toks[1]
            if (!url.match(/\w+:\/\/.*$/i)) {
              url = `ws://${url}`
            }
            remocon.connect( url ) // new url
          }else{
            remocon.connect()  // last url
          }
          break
        case 'show':
            wsConsole.showIncommingMessage = true
          break;
        case 'hide':
            wsConsole.showIncommingMessage = false
          break;

        default:
            // remocon.send( data )
          wsConsole.print(
            Console.Types.Error,
            'command list: .sub .pub .sig .sig_bin .ping .pong .echo .iam .open .connect .close .hex .frame .pub .sub',
            Console.Colors.Yellow
          )
      }
    } else {
      

    }
    wsConsole.prompt()
  })



} else {
  program.help()
}



