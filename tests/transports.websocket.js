var io = require('socket.io'),
    Listener = io.Listener,
    Client = require('socket.io/client'),
    WebSocket = require('./../support/node-websocket-client/lib/websocket').WebSocket,
    encode = require('socket.io/utils').encode,
    decode = require('socket.io/utils').decode;

module.exports = {
  
  'test connection and handshake': function(assert){
    var server = require('http').createServer(function(){}),
        sio, 
        close = function(){
          client.close();
          server.close();
          assert.ok(clientCount, 1);
          assert.ok(clientMessage, 'from client');
          assert.ok(serverMessage, 'from server');
        },
        check = function(){
          if (++trips == 2) close();
        },
        trips = 0,
        clientCount = 0,
        client, 
        clientMessage, 
        serverMessage;
    
    sio = io.listen(server, {log: function(){}});
    
    server.listen(8081, function(){
      var messages = 0;
      client = new WebSocket('ws://localhost:8081/socket.io/websocket', 'borf');
      client.onopen = function(){
        client.send(encode('from client'));
      };
      client.onmessage = function(ev){
        if (++messages == 2){ // first message is the session id
          serverMessage = decode(ev.data);
          check();
        }
      };
    });
    
    sio.on('connection', function(client){
      clientCount++;
      assert.ok(client instanceof Client);
      client.on('message', function(msg){
        clientMessage = msg;
        check();
      });
      client.send('from server');
    });
  },
  
  'test clients tracking': function(assert){
    var server = require('http').createServer(function(){})
      , sio = io.listen(server, {log: function(){}});
      
    server.listen(8082, function(){
      var client = new WebSocket('ws://localhost:8082/socket.io/websocket', 'borf');
      client.onopen = function(){
        assert.ok(Object.keys(sio.clients).length == 1);
  
        var client2 = new WebSocket('ws://localhost:8082/socket.io/websocket', 'borf');
        client2.onopen = function(){
          assert.ok(Object.keys(sio.clients).length == 2);
          
          client.close();
          client2.close();
          server.close();
        };
      }
    });
  },
  
  'test buffered messages': function(assert){
    var server = require('http').createServer(function(){})
      , sio = io.listen(server, {
          transportOptions: {
            websocket: {
              closeTimeout: 5000
            }
          },
          log: function(){}
        });
      
    server.listen(8083, function(){
      var client = new WebSocket('ws://localhost:8083/socket.io/websocket', 'borf');
      
      client.onopen = function(){
        assert.ok(Object.keys(sio.clients).length == 1);
        var sessionid = Object.keys(sio.clients)[0]
          , runOnce = false;
  
        sio.clients[sessionid].connection.addListener('end', function(){
          if (!runOnce){
            assert.ok(sio.clients[sessionid]._open == false);
            sio.clients[sessionid].send('should get this');
  
            var client2 = new WebSocket('ws://localhost:8083/socket.io/websocket/' + sessionid, 'borf');
            client2.onmessage = function(ev){
              assert.ok(Object.keys(sio.clients).length == 1);
              assert.ok(decode(ev.data), 'should get this');
              sio.clients[sessionid].options.closeTimeout = 0;
              client2.close();
              server.close();
            };
            runOnce = true;
          }
        });
        
        client.close();
      };
    });
  }
  
};