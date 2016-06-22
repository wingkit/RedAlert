var singleplayer = {
	// 开始单人战役
	start: function () {
		// 隐藏开始菜单图层
		$('.gamelayer').hide();

		// 从第一关开始
		singleplayer.currentLevel = 1;
		game.type = "singleplayer";
		game.team = "blue";

		// 最后，开始关卡
		singleplayer.startCurrentLevel();
	},
	play:function() {
		fog.initLevel();
		game.animationLoop();
		game.animationInterval = setInterval(game.animationLoop, game.animationTimeout);
		game.start();
	},
	exit: function () {
		// 显示开始菜单
		$('.gamelayer').hide();
		$('#gamestartscreen').show();
	},
	currentLevel: 0,
	startCurrentLevel: function () {
		// 获取用来构建关卡的数据
		var level = maps.singleplayer[singleplayer.currentLevel];

		// 加载资源完成之前，禁用“开始任务”按钮
		$('#entermission').attr("disabled", true);

		// 加载用来创建关卡的资源
		game.currentMapImage = loader.loadImage(level.mapImage);
		game.currentLevel = level;

		game.offsetX = level.startX + game.gridSize;
		game.offsetY = level.startY + game.gridSize;

		// 加载关卡的预加载单位类型
		game.resetArrays();
		for (var type in level.requirements) {
			var requirementArray = level.requirements[type];
			for (var i = 0; i < requirementArray.length; i++) {
				var name = requirementArray[i];
				if (window[type]) {
					window[type].load(name);
				} else {
					console.log('不能加载类型：', type);
				}
			};
		}

		for (var i = level.items.length - 1; i >= 0; i--) {
			var itemDetails = level.items[i];
			game.add(itemDetails);
		};

		// 创建网格，将不可通行网格单元赋值为1， 可通行赋值为0。
		game.currentMapTerrainGrid = [];
		for (var y = 0; y < level.mapGridHeight; y++) {
			game.currentMapTerrainGrid[y] = [];
			for (var x = 0; x < level.mapGridWidth; x++) {
				game.currentMapTerrainGrid[y][x] = 0;
			}
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
			$('#entermission').removeAttr("disabled");
		} else {
			loader.onload = function () {
				$('#entermission').removeAttr("disabled");
			}
		}

		// 加载任务简介画面
		$('#missionbriefing').html(level.briefing.replace(/\n/g, "<br\><br\>"));
		$('#missionscreen').show();
	},
	sendCommand: function (uids, details) {
		game.processCommand(uids,details);
	},
	endLevel: function (success) {
		clearInterval(game.animationInterval);
		game.end();

		if (success) {
			var moreLevels = (singleplayer.currentLevel < maps.singleplayer.length - 1);
			if (moreLevels) {
				game.showMessageBox("Mission Accomplished.", function () {
					$('.gamelayer').hide();
					singleplayer.currentLevel++;
					singleplayer.startCurrentLevel();
				});
			} else {
				game.showMessageBox("Mission Accomplished.<br /> <br />This was the last mission in the campaign.<br/><br/>Thank you for playing.", function () {
					$('.gamelayer').hide();
					$('#gamestartscreen').show();
				});
			}
		} else {
			game.showMessageBox("Mission Failed.<br/><br/> Try again?", function () {
				$('.gamelayer').hide();
				singleplayer.startCurrentLevel();
			}, function () {
				$('.gamelayer').hide();
				$('#gamestartscreen').show();
			});
		}
	},

}