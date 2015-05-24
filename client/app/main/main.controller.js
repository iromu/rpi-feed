'use strict';

angular.module('rpiFeedApp')
  .controller('MainCtrl', function ($scope, $http, socket) {

    var image = $('#stream')[0];
    var lastImage;

    function blobToImage(imageData) {
      if (Blob && 'undefined' !== typeof URL) {
        var blob = new Blob([imageData], {type: 'image/jpg'});
        return URL.createObjectURL(blob);
      } else if (imageData.base64) {
        return 'data:image/jpg;base64,' + imageData.data;
      } else {
        return 'about:blank';
      }
    }

    socket.socket.on('liveStream:frame', function (data) {
      console.log('liveStream:frame');
      if (lastImage && 'undefined' !== typeof URL) {
        URL.revokeObjectURL(lastImage);
      }
      image.src = blobToImage(data.buffer);
      lastImage = image.src;
    });

    function startStream() {
      socket.socket.emit('start-stream');
    }

    startStream();
  });
