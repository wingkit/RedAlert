var multiplayer = {
	// 打开多人对战大厅
	websocket_url: "ws://localhost:8090/",
	websocket: undefined,
	start: function () {
		game.type = "multiplayer";
		var WebSocketObject = window.WebSocket || window.MozWebSocket;
		if (!WebSocketObject) {
			game.showMessageBox("Your browser does not support WebSocket. Multiplayer will not work.");
			return;
		}
		this.websocket = new WebSocketObject(this.websocket_url);
		this.websocket.onmessage = multiplayer.handleWebSocketMessage;
		// 连接后显示多人对战大厅界面
		this.websocket.onopen = function () {
			// 隐藏开始菜单层
			$('.gamelayer').hide();
			$('#multiplayerlobbyscreen').show();
		}
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
		}

	},
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
};