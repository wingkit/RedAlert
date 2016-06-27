// 创建一个HTTP服务器
var http = require('http');

// 创建一个简单的服务器，直接将请求内容作为返回结果
var server = http.createServer(function (request, response) {
	console.log('Received Http request for url ', request.url);
	response.writeHead(200, { 'Content-Type': 'text/plain' });
	response.end("This is a simple node.js HTTP server.");
});

// 监听8080端口
server.listen(8090, function () {
	console.log('Server has started listening on port 8090');
});

// 向HTTP服务器添加WebSocket服务器
var WebSocketServer = require('websocket').server;
var wsServer = new WebSocketServer({
	httpServer:server
});

// 判断指定的连接是否被允许
function connectionIsAllowed(request) {
	// 检查如request.origin/request.remoteAddress等条件
	return true;
}

// 处理 WebSocket连接请求
wsServer.on('request', function (request) {
	// 某些条件下拒绝请求
	if (!connectionIsAllowed(request)) {
		request.reject();
		console.log('WebSocket Connection from ' + request.remoteAddress + ' rejected.');
		return;
	}

	// 接收连接
	var websocket = request.accept();
	console.log('WebSocket Connection from ' + request.remoteAddress + ' accepted.');
	websocket.send('Hi there. You are now connected to the WebSocket Server');

	websocket.on('message', function (message) {
		if (message.type == "utf-8") {
			console.log('Received Message: ' + message.utf8Data);
			websocket.send('Server received your message: ' + message.utf8Data);
		}
	});

	websocket.on('close', function (reasonCode, description) {
		console.log('WebSocket Connection from ' + request.remoteAddress + ' closed.');
	});
});