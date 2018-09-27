'use strict';

const swVersion = '3';



if (typeof BroadcastChannel === 'undefined') {
	self.importScripts('bc.js');
}


const channel = new BroadcastChannel('cachecommand');

channel.onmessage = msg => {
	console.log('received channel message2');
	console.log(msg);
};

self.addEventListener('install', function (event) {
	console.log('install event123');
});



self.addEventListener('activate', function (event) {
	console.log('activate event');
});


self.addEventListener('fetch', function (event) {
	console.log('fetch: ' + event.request.url);
});


self.addEventListener('message', function (event) {
	console.log('message event: ' + event);
});

