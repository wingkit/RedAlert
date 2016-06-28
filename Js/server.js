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
// 当前在线玩家
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
		latencyTrips: [],
	};
	players.push(player);

	// 玩家首次连接时，发送一个空的游戏房间状态列表
	sendRoomList(connection);

	// 为玩家测量传输延迟
	measureLatency(player);

	// 连接的onmessgae事件响应函数
	connection.on('message', function (message) {
		if (message.type == 'utf8') {
			var clientMessage = JSON.parse(message.utf8Data);
			switch (clientMessage.type) {
				// 处理不同类型的消息
				case "join_room":
					var room = joinRoom(player, clientMessage.roomId);
					sendRoomListToEveryone();
					if (room.players.length == 2) {
						initGame(room);
					}
					break;
				case "leave_room":
					leaveRoom(player, clientMessage.roomId);
					sendRoomListToEveryone();
					break;
				case "initialized_level":
					player.room.playersReady++;
					if (player.room.playersReady == 2) {
						startGame(player.room);
					}
					break;
				case "latency_pong":
					finishMeasuringLatency(player, clientMessage);
					// 至少三次侧脸传输延迟
					if (player.latencyTrips.length < 3) {
						measureLatency(player);
					}
					break;
				case "command":
					if (player.room && player.room.status == "running") {
						if (clientMessage.uids) {
							player.room.commands.push({ uids: clientMessage.uids, details: clientMessage.details });
						}
						player.room.lastTickConfirmed[player.color] = clientMessage.currentTick + player.tickLag;
					}
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

// 初始化一组房间
var gameRooms = [];
for (var i = 0; i < 10; i++) {
	gameRooms.push({ status: "empty", players: [], roomId: i + 1 });
};

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
	} else if (room.players.length == 2) {
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
	console.log("Removing player from room", roomId);

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

function initGame(room) {
	console.log(room.roomId + "号房间正在初始化游戏");

	// 已加载关卡的玩家数量
	room.playersReady = 0;

	// 为两个玩家加载多人对战关卡，这里可以做改变，以云溪玩家选择一个关卡
	var currentLevel = 0;

	// 为两位玩家随机出生点（0~3之间）
	var spawns = [0, 1, 2, 3];
	var spawnLocations = {
		"blue": spawns.splice(Math.floor(Math.random() * spawns.length), 1),
		"green": spawns.splice(Math.floor(Math.random() * spawns.length), 1),
	};
	sendRoomWebSocketMessage(room, { type: "init_level", spawnLocations: spawnLocations, level: currentLevel });

}

function startGame(room) {
	console.log(room.roomId + "号房间的玩家已经准备就绪。");
	room.status = "running";
	sendRoomListToEveryone();
	// 通知玩家开始游戏
	sendRoomWebSocketMessage(room, { type: "start_game" });

	room.commands = [];
	room.lastTickConfirmed = { "blue": 0, "green": 0 };
	room.currentTick = 0;

	// 房间的步进延迟为两个玩家各自步进延迟中的较大者
	var roomTickLag = Math.max(room.players[0].tickLag, room.players[1].tickLag);

	room.interval = setInterval(function () {
		// 确认到步进时，两个玩家都已经发送过了命令
		if (room.lastTickConfirmed["blue"] >= room.currentTick
			&& room.lastTickConfirmed["green"] >= room.currentTick) {
			// 命令将在步进延迟后执行
			sendRoomWebSocketMessage(room, { type: "game_tick", tick: room.currentTick + roomTickLag, commands: room.commands });
			room.currentTick++;
			room.commands = [];
		} else {
			// 一个玩家导致游戏延迟，则做相应的处理
			if (room.lastTickConfirmed["blue"] < room.currentTick - 1) {
				console.log("Room", room.roomId, "Blue is lagging on Tick:",
					room.currentTick, "by", room.currentTick - room.lastTickConfirmed["blue"]);
			}
			if (room.lastTickConfirmed["green"] < room.currentTick - 1) {
				console.log("Room", room.roomId, "Green is lagging on Tick:",
					room.currentTick, "by", room.currentTick - room.lastTickConfirmed["green"]);
			}
		}
	}, 100);
}

function sendRoomWebSocketMessage(room, messageObject) {
	var messageString = JSON.stringify(messageObject);
	for (var i = room.players.length - 1; i >= 0; i--) {
		room.players[i].connection.send(messageString);
	};
}

// 测量网络传输时间的方法
function measureLatency(player) {
	var connection = player.connection;
	var measurement = { start: Date.now() };
	player.latencyTrips.push(measurement);
	var clientMessage = { type: "latency_ping" };
	connection.send(JSON.stringify(clientMessage));
}

function finishMeasuringLatency(player, clientMessage) {
	var measurement = player.latencyTrips[player.latencyTrips.length - 1];
	measurement.end = Date.now();
	measurement.roundTrip = measurement.end - measurement.start;
	player.averageLatency = 0;
	for (var i = 0; i < player.latencyTrips.length; i++) {
		player.averageLatency += measurement.roundTrip / 2;
	};
	player.averageLatency = player.averageLatency / player.latencyTrips.length;
	player.tickLag = Math.round(player.averageLatency * 2 / 100) + 1;
	console.log("Measuring Latency for player.Attempt ",
		player.latencyTrips.length, "- Average Latency:",
		player.averageLatency, "Tick Lag:", player.tickLag);
}