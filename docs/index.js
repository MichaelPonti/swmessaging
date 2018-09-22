
document.getElementById('btnmessage').addEventListener('click', function (event) {
	console.log('test post message');
	navigator.serviceWorker.controller.postMessage('from test button');
});



