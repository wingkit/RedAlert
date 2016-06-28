var multiplayer = {
	// 打开多人对战大厅
	websocket_url: "ws://localhost:8090/",
	websocket: undefined,
	chrrentLevel:0,
	start: function () {
		game.type = "multiplayer";
		var WebSocketObject = window.WebSocket || window.MozWebSocket;
		if (!WebSocketObject) {
			game.showMessageBox("Your browser does not support WebSocket. Multiplayer will not work.");
			return;
		}
		this.websocket = new WebSocketObject(this.websocket_url);
		// 当收到信息时触发
		this.websocket.onmessage = multiplayer.handleWebSocketMessage;
		// 连接后显示多人对战大厅界面
		this.websocket.onopen = function () {
			// 隐藏开始菜单层
			$('.gamelayer').hide();
			$('#multiplayerlobbyscreen').show();
		};
		this.websocket.onclose = function () {
			multiplayer.endGame("服务器连接失败！");
		};
		this.websocket.onerror = function () {
			multiplayer.endGame("服务器连接出错！");
		};
	},
	handleWebSocketMessage: function (message) {
		// JSON.stringify();
		var messageObject = JSON.parse(message.data);
		switch (messageObject.type) {
			case "room_list":
				multiplayer.updateRoomStatus(messageObject.status);
				break;
			case "joined_room":
				multiplayer.roomId = messageObject.roomId;
				multiplayer.color = messageObject.color;
				break;
			case "init_level":
				multiplayer.initMultiplayerLevel(messageObject);
				break;
			case "start_game":
				multiplayer.startGame();
				break;
			case "latency_ping":
				multiplayer.sendWebSocketMessage({ type: "latency_pong" });
				break;
			case "game_tick":
				multiplayer.lastReceivedTick = messageObject.tick;
				multiplayer.commands[messageObject.tick] = messageObject.commands;
				break;
			case "end_game":
				multiplayer.endGame(messageObject.reason);
				break;
			case "chat":
				game.showMessage(messageObject.from, messageObject.message);
				break;
		}

	},
	// 状态信息
	statusMessage: {
		'starting': 'Game Starting',
		'running': 'Game in Progress',
		'waiting': 'Awaiting second player',
		'empty': 'Open',
	},
	updateRoomStatus: function (status) {
		var $list = $('#multiplayergameslist');
		$list.empty(); // 移除旧的选项
		for (var i = 0; i < status.length; i++) {
			var key = "Game " + (i + 1) + ". " + this.statusMessage[status[i]];
			$list.append(
				$('<option></option>').attr("disabled", status[i] == "running" || status[i] == "starting")
				.attr("value", (i + 1))
				.text(key)
				.addClass(status[i])
				.attr("selected", (i + 1) == multiplayer.roomId));
		};

	},
	join: function () {
		var selectedRoom = document.getElementById('multiplayergameslist').value;
		if (selectedRoom) {
			multiplayer.sendWebSocketMessage({ type: "join_room", roomId: selectedRoom });
			document.getElementById('multiplayergameslist').disabled = true;
			document.getElementById('multiplayerjoin').disabled = true;
		} else {
			game.showMessageBox("菜鸟 你得先选个房啊！");
		}
	},
	cancel: function () {
		// 离开任何已存在的游戏房间
		if (multiplayer.roomId) {
			multiplayer.sendWebSocketMessage({ type: "leave_room", roomId: multiplayer.roomId });
			document.getElementById('multiplayergameslist').disabled = false;
			document.getElementById('multiplayerjoin').disabled = false;
			delete multiplayer.roomId;
			delete multiplayer.color;
			return;
		} else {
			// 不在房间中，就离开多人对战界面
			multiplayer.closeAndExit();
		}
	},
	closeAndExit: function () {
		// 清除事件处理函数并
		multiplayer.websocket.onopen = null;
		multiplayer.websocket.onclose = null;
		multiplayer.websocket.onerror = null;
		multiplayer.websocket.close();

		document.getElementById('multiplayergameslist').disabled = false;
		document.getElementById('multiplayerjoin').disabled = false;
		// 显示开始菜单层
		$('.gamelayer').hide();
		$('#gamestartscreen').show();
	},
	sendWebSocketMessage: function (messageObject) {
		this.websocket.send(JSON.stringify(messageObject));
	},
	initMultiplayerLevel: function (messageObject) {
		$('.gamelayer').hide();
		var spawnLocations = messageObject.spawnLocations;

		// 初始化U盾偶人对战相关的变量
		multiplayer.commands = [[]];
		multiplayer.lastReceivedTick = 0;
		multiplayer.currentTick = 0;

		game.team = multiplayer.color;

		// 为关卡加载所有的单位
		multiplayer.currentLevel = messageObject.level;
		var level = maps.multiplayer[multiplayer.currentLevel];

		// 关卡加载所有的资源
		game.currentMapImage = loader.loadImage(level.mapImage);
		game.currentLevel = level;

		// 基于来自服务器的出生位置设置偏移量
		// 加载关卡所需要的单位类型
		game.resetArrays();
		for (var type in level.requirements) {
			var requirementArray = level.requirements[type];
			for (var i = 0; i < requirementArray.length; i++) {
				var name = requirementArray[i];
				if (window[type]) {
					window[type].load(name);
				} else {
					console.log("加载失败：" + type);
				}
			};
		};

		for (var i = level.items.length - 1 ; i >= 0; i--) {
			var itemDetails = level.items[i];
			game.add(itemDetails);
		};

		// 在玩家的出生位置分别为其添加起始单位
		for (team in spawnLocations) {
			var spawnIndex = spawnLocations[team];
			for (var i = 0; i < level.teamStartingItems.length; i++) {
				var itemDetails = $.extend(true, {}, level.teamStartingItems[i]);
				itemDetails.x += level.spawnLocations[spawnIndex].x + itemDetails.x;
				itemDetails.y += level.spawnLocations[spawnIndex].y + itemDetails.y;
				itemDetails.team = team;
				game.add(itemDetails);
			};

			if (team == game.team) {
				game.offsetX = level.spawnLocations[spawnIndex].startX * game.gridSize;
				game.offsetY = level.spawnLocations[spawnIndex].startY * game.gridSize;
			}
		};

		// 创建可通行网格，可通行的网格值为1，不可通行的网格值为0
		game.currentMapTerrainGrid = [];
		for (var y = 0; y < level.mapGridHeight; y++) {
			game.currentMapTerrainGrid[y] = [];
			for (var x = 0; x < level.mapGridWidth; x++) {
				game.currentMapTerrainGrid[y][x] = 0;
			};
		};
		for (var i = level.mapObstructedTerrain.length - 1; i >= 0; i--) {
			var obstruction = level.mapObstructedTerrain[i];
			game.currentMapTerrainGrid[obstruction[1]][obstruction[0]] = 1;
		};
		game.currentMapPassableGrid = undefined;

		// 为游戏加载启动资金
		game.cash = $.extend([], level.cash);

		// 加载资源完成后，启用“开始任务”按钮
		if (loader.loaded) {
			multiplayer.sendWebSocketMessage({ type: "initialized_level" });
		} else {
			loader.onload = function(){
				multiplayer.sendWebSocketMessage({ type: "initialized_level" });
			}
		}
	},
	startGame: function () {
		fog.initLevel();
		game.animationLoop();
		multiplayer.animationInterval = setInterval(multiplayer.tickLoop, game.animationTimeout);
		game.start();
	},
	sendCommand: function (uids, details) {
		multiplayer.sentCommandForTick = true;
		multiplayer.sendWebSocketMessage({ type: "command", uids: uids, details: details, currentTick: multiplayer.currentTick });

	},
	tickLoop: function () {
		// 如果该步进数的命令被接收了，就执行命令并进行下一次步进，否则，等待服务器捕获
		if (multiplayer.currentTick <= multiplayer.lastReceivedTick) {
			var commands = multiplayer.commands[multiplayer.currentTick];
			if (commands) {
				for (var i = 0; i < commands.length; i++) {
					game.processCommand(commands[i].uids, commands[i].details);
				};
			}
			game.animationLoop();

			// 当前步进时没有命令，则向服务器发送空命令，这样服务器就知道客户端在流畅地运行
			if (!multiplayer.sentCommandForTick) {
				multiplayer.sendCommand();
			}
			multiplayer.currentTick++;
			multiplayer.sentCommandForTick = false;
		}
	},
	// 告知服务器玩家输掉了游戏
	loseGame: function () {
		multiplayer.sendWebSocketMessage({ type: "lose_game" });
	},
	endGame: function (reason) {
		game.running = false;
		clearInterval(multiplayer.animationInterval);
		// 显示技术游戏的原因，并按OK按钮，以退出多人对战游戏
		game.showMessageBox(reason, multiplayer.closeAndExit);
	}
};

$(window).keydown(function (e) {
	// 仅当多人游戏运行时才允许聊天
	if (game.type != "multiplayer" || !game.running) {
		return;
	}

	var keyPressed = e.which;
	if (keyPressed == 13) { // Enter
		var isVisible = $('#chatmessage').is(':visible');
		if (isVisible) {
			// 如果聊天框可见，按下Enter键将发送消息并隐藏聊天框
			if ($('#chatmessage').val()!==''){
				multiplayer.sendWebSocketMessage({ type: "chat", message: $('#chatmessage').val() });
				$('#chatmessage').val('');
			}
			$('#chatmessage').hide();
		} else {
			// 如果聊天框不可见，按下Enter键将显示聊天框
			$('#chatmessage').show();
			$('#chatmessage').focus();
		}
		e.preventDefault();
	} else if (keyPressed == 27) { // Escape
		// 按下Escape键将隐藏聊天框
		$('#chatmessage').hide();
		$('#chatmessage').val('');
		e.preventDefault();
	}
});