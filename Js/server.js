var WebSocketServer = require('websocket').server;
var http = require('http');

// 创建一个简单的web服务器，为任何请求返回相同的回应
var server = http.createServer(function (request, response) {
	response.writeHead(200, { 'Content-Type': 'text/plain' });
	reaponse.end("This is the node.js HTTP server.");
});

server.listen(8090, function () {
	console.log('Server has started listening on port 8090');
});

var wsServer = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false,
});

// 判断某个连接是否应当被允许
function connectionIsAllowed(request) {
	// 检查条件， 如request.origin 和 request.remoteAddress
	return true;
}

// 初始化一组房间
var gameRooms = [];
for (var i = 0; i < 10; i++) {
	gameRooms.push({ status: "empty", players: [], roomId: i + 1 });
};

var players = [];
wsServer.on('request', function (request) {
	if (!connectionIsAllowed(request)) {
		request.reject();
		console.log('Connection from ' + request.remoteAddress + ' rejected.');
		return;
	}

	var connection = request.accept();
	console.log('Connection from ' + request.remoteAddress + ' accepted.');

	// 将player 加入到 players数组中
	var player = {
		connection: connection,
	};
	players.push(player);

	// 玩家首次连接时，发送一个空的游戏房间状态列表
	sendRoomList(connection);

	// 连接的onmessgae事件响应函数
	connection.on('message', function (message) {
		if (message.type == 'utf8') {
			var clientMessage = JSON.parse(message.utf8Data);
			switch (clientMessage.type) {
				// 处理不同类型的消息
				case "join_room":
					var clientMessage = JSON.parse(message.utf8Data);
					sendRoomListToEveryone();
					break;
				case "leave_room":
					leaveRoom(player, clientMessage.roomId);
					sendRoomListToEveryone();
					break;
			}
		}
	});

	connection.on('close', function (reasonCode, description) {
		console.log('Connection from ' + request.remoteAddress + ' disconnected.');
		for (var i = players.length - 1; i >= 0; i--) {
			if (players[i] == player) {
				players.splice(i, 1);
			}
		};
		// 如果玩家仍然在房间中，移除他并通知所有人
		if (player.room) {
			var status = player.room.status;
			var roomId = player.room.roomId;
			// 如果游戏还在运行中，就结束游戏
			leaveRoom(player, roomId);
			sendRoomListToEveryone();
		}
	});
});

function sendRoomList(connection) {
	var status = [];
	for (var i = 0; i < gameRooms.length; i++) {
		status.push(gameRooms[i].status);
	};
	var clientMessage = { type: "room_list", status: status };
	connection.send(JSON.stringify(clientMessage));
}

function sendRoomListToEveryone() {
	// 房间状态发生变化时，通知所有在连接的玩家
	var status = [];
	for (var i = 0; i < gameRooms.length; i++) {
		status.push(gameRooms[i].status);
	};
	var clientMessage = { type: "room_list", status: status };
	var clientMessageString = JSON.stringify(clientMessage);
	for (var i = 0; i < players.length; i++) {
		players[i].connection.send(clientMessageString);
	};
}

function joinRoom(player, roomId) {
	var room = gameRooms[roomId - 1];
	console.log("Adding player to room", roomId);
	// 向房间中添加一个玩家
	room.players.push(player);
	player.room = room;
	// 更新状态
	if (room.players.length == 1) {
		room.status = "waiting";
		player.color = "blue";
	} else if(room.players.length ==2) {
		room.status = "starting";
		player.color = "green";
	}
	// 向玩家确认， 他已经被加入了
	var confirmationMessageString = JSON.stringify({ type: "joined_room", roomId: roomId, color: player.color });
	player.connection.send(confirmationMessageString);
	return room;
}

function leaveRoom(player, roomId) {
	var room = gameRooms[roomId - 1];
	console.log("Removing player from room", rooomId);

	for (var i = room.players.length - 1; i >= 0; i--) {
		if (room.players[i] == player) {
			room.players.splice(i, 1);
		}
	};
	delete player.room;
	// 更新房间状态
	if (room.players.length == 0) {
		room.status = "empty";
	} else if (room.players.length == 1) {
		room.status = "waiting";
	}
}