# remocon ( remote-signal console )

This is a remote-signal server and client CLI program. 

This program use [remote-signal](https://www.npmjs.com/package/remote-signal) library.


## install

```sh
$ sudo npm install -g remocon
# global install.
```


## remote-signal server

```sh
$ remote-server # or  use 'remocons'  alias
# start server with default option.
# default. open port 7777 with WebSocket. 


$ remocons -l 5555 
# you can specify listen port number

```

## remote-signal client


```sh
$ remote # or remocon alias
# connect to localhost:7777 with websocket.

# use -c to define websocket url and port number.
$ remote -c wss://websocket_server_url:port
$ remote -c ws://localhost:7777

# support ws or wss(TLS).

```

## remote-signal commands

- subscribe('tag')
- publish('tag', message ) 
- signal('tag', message )  // same with publish
- not ready whole document.

## tutorial 

### signaling 

- multi-cast: publish/subscribe channel_name
- uni-cast: use cid(communication id)

1. start server
```sh
$ remote-server
# or same below
$ remocons 
```

2. start client A.

```sh
$ remote
Connecting to ws://localhost:7777
ready:  cid: ?c3Nr 
# connected and receive client cid.
# CID(Communicaion Id of the remote client.)

> .subscribe channel_name  
# subscribe some channel
```

3. start client B.
```sh
$ remote
Connecting to ws://localhost:7777
ready:  cid: ?rr75
> 
# connected and received cid.

# multicast.
> .signal channel_name some_message   

# unicast to A.
> .signal ?c3Nr@ direct_message  
# IMPORTANT. 
# unicast signal tag must include '@' charactor.  tag = 'cid' + @
```

### authentication

#### auth data from file.

- for personal use only
- raw plain password string. (Not Hashed)
- each device have 3 values: `deviceId`, `deviceKey`, `deviceCId`
- you can find sample authFile.json in root folder.
```sh
$ remocons -d authFile.json
```

authFile.json structure
- deviceId string size limit: 8 charactors.
- No passphrase string limit. (It will be digested 32bytes with sha256.)
- CID string size limit: current 20 chars. can be changed.
- JSON file does not support comment.
```js
[
  ["id","key","cid"],
  ["did2","did2key","did2-cid"]
  ["uno3","uno3-key","uno3-cid"]
]
```

#### auth data from Redis(or other DB)
- Recommended
- you can find example source code from
  - AuthRedis.js .. ( remocon/src )
  - AuthCore.js ( remote-siganl/src/auth )

start server with redis-auth-system
```sh
$ remote-server-redis
```


#### auth client
1. start auth server.
2. connect and login

```sh
$ remote
ready:  cid: ?YXDr
> .login uno3 uno3-key
try manual login:  uno3
> >> QUOTA_LEVEL :  1
current quota: {"signalSize":255,"publishCounter":10,"trafficRate":100000}
ready:  cid: uno3-cid
 
# now device have (pre-registered) CID.

```

