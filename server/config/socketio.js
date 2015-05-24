(function () {
  /**
   * Socket.io configuration
   */

  'use strict';

  var config = require('./environment');
  var os = require('os');
  var _ = require('lodash');
  var spawn = require('child_process').spawn;
  var proc;
  var sockets = {};
  var notStreaming = true;
  var fs = require('fs');

  var Lock = require('./file.lock.js');
  var streamWatch;

  var STREAM_FILE = '/dev/shm/image_stream.jpg';

  //var forever = require('forever-monitor');

  var picIdx = 0;

  //var Stream = require('stream');

  function acquireFromRaspistill(STREAM_FILE) {

    spawn('touch', STREAM_FILE);

    var args = ['-w', '640', '-h', '480', '-n', '-o', STREAM_FILE, '-t', '999999999', '-tl', '1000'];

    proc = spawn('raspistill', args);

    proc.on('close', function (code, signal) {
      console.info('child process terminated due to receipt of signal ' + signal);
    });

    proc.stderr.on('data', function (data) {
      console.error('stderr:' + data);
    });

    return proc;
  }

  function stopStreaming() {
    if (Object.keys(sockets).length === 0) {
      console.info('Killing process');
      notStreaming = true;
      Lock.watchingFile = false;
      try {
        if (proc) proc.kill();
      } catch (exception) {
      }
      if (streamWatch)streamWatch.close();
    }
  }

  var startStreamWatch = function (io) {
    var events = 0;
    streamWatch = fs.watch(STREAM_FILE, {persistent: false}, function (current, previous) {
      //console.info('File changed ' + current + ' <- ' + previous);
      events++;
      if (current === 'change') {
        var imageName = 'image_stream.jpg?_i=' + picIdx++ + '&_t=' + (Math.random() * 100000);
        fs.readFile(STREAM_FILE, function (err, data) {
          if (err) throw err;
          //console.info('liveStream:frame ' + imageName);
          io.sockets.emit('liveStream:frame', {name: imageName, buffer: data});
        });
        io.sockets.emit('liveStream', imageName);

        // FIX for chunked writing and file renaming
        if (streamWatch)streamWatch.close();
        startStreamWatch(io);
      }
    });
  };

  function startStreaming(io) {
    if (notStreaming) {
      picIdx = 0;
      proc = acquireFromRaspistill(STREAM_FILE);
      //var stream = new Stream();
      /*var buffers = [];
       var chunks = 3;
       proc.stdout.on('data', function (data) {
       if (picIdx > 1 && (picIdx + 1) % chunks === 0) {
       var imageName = 'image_stream.jpg?_i=' + picIdx + '&_t=' + (Math.random() * 100000);
       console.info('liveStream:frame Sending buffer ' + picIdx);
       //console.info(data);
       buffers.push(data);
       io.sockets.emit('liveStream:frame', {picIdx: picIdx, name: imageName, buffer: Buffer.concat(buffers)});
       }
       else {
       if (picIdx > 1 && (picIdx - 1) % chunks)buffers = [];
       buffers.push(data);
       }
       picIdx += 1;
       });*/
      notStreaming = false;
      startStreamWatch(io);
      console.log('Watching for changes...');
      Lock.watchingFile = true;

    } else {
      io.sockets.emit('liveStream', 'image_stream.jpg?_t=' + (Math.random() * 100000));
    }
  }

  function onDisconnect(socket) {
    delete sockets[socket.id];

    stopStreaming();

    console.info('[%s@%s#%s] Socket disconnected', socket.id, os.hostname(), config.uid);
    socket.broadcast.emit('server:message', 'Socket disconnected ' + socket.id + ' to ' + os.hostname() + '#' + config.uid);
    socket.broadcast.emit('socket:disconnect', socket.id);

  }

  function onConnect(socket) {
    console.info('[%s@%s#%s] Socket connected', socket.id, os.hostname(), config.uid);
  }

  function joinRoom(socket, roomName) {
    socket.join(roomName);
    socket.broadcast.to(roomName).emit('server:message', 'a client enters');
    socket.emit('server:message', 'You entered in room ' + roomName);
    socket.emit('room:joined', roomName);

    console.info('[%s@%s#%s] joined room %s', socket.id, os.hostname(), config.uid, JSON.stringify(roomName, null, 2));
  }

  function leaveRoom(socket, roomName) {
    socket.leave(roomName);
    socket.broadcast.to(roomName).emit('server:message', 'a user leaves');
    socket.emit('server:message', 'You leave room ' + roomName);

    console.info('[%s@%s#%s] leaveRoom %s', socket.id, os.hostname(), config.uid, JSON.stringify(roomName, null, 2));
  }

  module.exports = function (socketio) {

    socketio.on('connection', function (socket) {

      sockets[socket.id] = socket;

      socket.address = socket.handshake.address !== null ?
      socket.handshake.address.address + ':' + socket.handshake.address.port :
        process.env.DOMAIN;

      socket.connectedAt = new Date();

      socket.on('room:join', function (roomName) {
        joinRoom(socket, roomName);
      });
      socket.on('room:leave', function (roomName) {
        leaveRoom(socket, roomName);
      });

      // Call onDisconnect.
      socket.on('disconnect', function () {
        onDisconnect(socket, socketio);
        console.info('[%s] DISCONNECTED', socket.id);
      });

      socket.on('start-stream', function () {
        startStreaming(socketio);
      });

      console.info('[%s] CONNECTED', socket.id);

      // Call onConnect.
      onConnect(socket);
    });
  };
}());
