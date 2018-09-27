
const channel = new BroadcastChannel('cachecommand');

channel.onmessage = msg => {
	console.log('received channel message');
	console.log(msg);
};

self.addEventListener('install', function (event) {
	console.log('install event');
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

