if (process.argv.length < 2) {
  console.log(
    'Usage: \n' +
    'node stream-server-websockets.js [<stream-port> <websocket-port>]'
  );
  process.exit();
}

var
  STREAM_PORT = process.argv[2] || 8082,
  WEBSOCKET_PORT = process.argv[3] || 8084,
  STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes

var width = 320,
  height = 240;

function sendMagicBytes(socket) {
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  var streamHeader = new Buffer(8);
  streamHeader.write(STREAM_MAGIC_BYTES);
  streamHeader.writeUInt16BE(width, 4);
  streamHeader.writeUInt16BE(height, 6);
  socket.send(streamHeader, {binary: true});
}

// Websocket Server
var socketServer = new (require('ws').Server)({port: WEBSOCKET_PORT});
socketServer.on('connection', function (socket) {
  sendMagicBytes(socket);
  console.log('New WebSocket Connection (' + socketServer.clients.length + ' total)');

  socket.on('close', function (code, message) {

    console.log('Disconnected WebSocket (' + socketServer.clients.length + ' total)');
  });

  socket.on('message', function (data) {
    console.log(data);
  });
});

socketServer.broadcast = function (data, opts) {
  for (var i in this.clients) {
    if (this.clients[i].readyState == 1) {
      this.clients[i].send(data, opts);
    }
    else {
      console.log('Error: Client (' + i + ') not connected.');
    }
  }
};

// HTTP Server to accept incomming MPEG Stream
require('http').createServer(function (request, response) {
  var params = request.url.substr(1).split('/');

  response.connection.setTimeout(0);

  width = (params[0] || 320) | 0;
  height = (params[1] || 240) | 0;

  console.log(
    'Stream Connected: ' + request.socket.remoteAddress +
    ':' + request.socket.remotePort + ' size: ' + width + 'x' + height
  );
  request.on('data', function (data) {
    socketServer.broadcast(data, {binary: true});
  });

}).listen(STREAM_PORT);

console.log('Listening for MPEG Stream on http://127.0.0.1:' + STREAM_PORT + '/<width>/<height>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:' + WEBSOCKET_PORT + '/');
