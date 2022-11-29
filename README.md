# remocon ( remote-signal console )

- ``In development!!``
- CLI: remote-signal server and client.
- It use [remote-signal](https://www.npmjs.com/package/remote-signal) package.


## install

```
# sudo npm install -g remocon
```


## remote-signal server

```js
> remote-server // or  use 'remocons'  alias name
// start server with default option.
// open port 7777 with websocket. 
// open port 7778 with congpacket/tcp. 


> remocons -l 8888 
// you can specify listen port number

```

## remote-signal client


```js
> remote // alias remocon
// connect to localhost:7777 with websocket.

> remote -c wss://websocket_url:port
> remote -c ws://localhost:7777
// define websocket url and port number.
// support ws or wss(TLS).

> remote -c tcp://localhost:7778
// connect to remote-server with congpacket/tcp protocol.

```

## remote-signal commands

- subscribe('tag')
- publish('tag', message )  // alias. signal
- ...

## tutorial 

### signaling 

- multi-cast: publish/subscribe channel_name
- uni-cast: use cid(communication id)

1. start server
```
> remote-server
```

2. start client A.

```js
> remote
>> CID_ACK:  qosr7B0Z   // connected. receive cid.

> .subscribe channel_name  // subscribe some channel
```

3. start client B.
```js
> remote
>> CID_ACK:  JjSim4JT   // connected. receive cid.

> .signal channel_name some_message   // multicast.
> .signal qosr7B0Z direct_message  // unicast to A.
```

### authentication
- when you have registered id and key.

```js
> remocon
> .login id password

AUTHORIZED. TLS: false
>> CID_ACK:  uno   // now device have (pre-registered) cid.

```




