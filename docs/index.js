'use strict';

var BroadcastChannel = require('broadcast-channel');


const channel = new BroadcastChannel('cachecommand');






document.getElementById('btnmessage').addEventListener('click', function (event) {
	console.log('test post message');
	//navigator.serviceWorker.controller.postMessage('from test button');
	channel.postMessage({ cmd: 'cacheOn', name: 'model1' });
});



