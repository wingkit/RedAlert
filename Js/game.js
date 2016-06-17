﻿$(window).load(function () {
	game.init();
});

var game = {
	cash: null, // 启动资金

	// 开始预加载资源
	init: function () {
		loader.init();
		mouse.init();
		sidebar.init();

		$('.gameloader').hide();
		$('#gamestartscreen').show();

		game.backgroundCanvas = document.getElementById('gamebackgroundcanvas');
		game.backgroundContext = game.backgroundCanvas.getContext('2d');

		game.foregroundCanvas = document.getElementById('gameforegroundcanvas');
		game.foregroundContext = game.foregroundCanvas.getContext('2d');

		game.canvasWidth = game.backgroundCanvas.width;
		game.canvasHeight = game.backgroundCanvas.height;
	},
	start: function () {
		$('.gamelayer').hide();
		$('#gameinterfacescreen').show();
		game.running = true;
		game.refreshBackground = true;

		game.drawingLoop();
	},
	// 地图被分割成20像素X20像素的方形网格
	gridSize: 20,

	// 记录背景是否移动了，是否需要被重绘
	backgroundChanged: true,

	// 控制循环，运行固定的时间
	animationTimeout: 100, // 100毫秒，10次/s
	offsetX: 0, // 地图平移偏移量，x和y
	offsetY: 0,
	refreshBackground: false, // 刷新地图
	animationLoop: function () {
		// 显示侧边栏
		sidebar.animate();

		// 使所有指定了命令的单位执行命令
		for (var i = game.items.length - 1; i >= 0; i--) {
			if (game.items[i].processOrders) {
				game.items[i].processOrders();
			}
		}

		// 执行游戏中每个物体的动画循环
		for (var i = game.items.length - 1; i >= 0; i--) {
			game.items[i].animate();
		};

		// 基于x和y坐标对游戏中所有的单位项排序为sortedItems数组
		game.sortedItems = $.extend([], game.items);
		game.sortedItems.sort(function (a, b) {
			return b.y - a.y + ((b.y == a.y) ? (a.x - b.x) : 0);
		});
	},
	drawingInterpolationFactor:null,// 高延迟弥补插值因子
	drawingLoop: function () {
		// 处理地图平移
		game.handlePadding();

		// 检查距上一次动画循环的时间并计算出一个线性插值两（-1~0）
		// 绘制比动画发生得更频繁
		game.lastDrawTime = (new Date()).getTime();
		if (game.lastAnimationTime) {
			game.drawingInterpolationFactor = (game.lastDrawTime - game.lastAnimationTime) / game.animationTimeout - 1;
			if (game.drawingInterpolationFactor > 0) { // 下一个动画循环之外无点插值
				game.drawingInterpolationFactor = 0;
			}
		} else {
			game.drawingInterpolationFactor = -1;
		}

		// 绘制背景地图是一项庞大的工作, 我们仅仅在地图改变（平移)时重绘之。
		if (game.refreshBackground) {
			game.backgroundContext.drawImage(game.currentMapImage, game.offsetX, game.offsetY, game.canvasWidth, game.canvasHeight, 0, 0, game.canvasWidth, game.canvasHeight);
			game.refreshBackground = false;
		} 
		// 清空前景canvas
		game.foregroundContext.clearRect(0, 0, game.canvasWidth, game.canvasHeight);

		// 绘制前景上的物体
		for (var i = game.sortedItems.length - 1; i >= 0; i--) {
			game.sortedItems[i].draw();
		};

		// 绘制鼠标
		mouse.draw();

		// 使用requestAnimationFrame调用下一次绘图循环
		if (game.running) {
			requestAnimationFrame(game.drawingLoop);
		}
	},
	panningThreshold: 60, // 与canvas边缘的距离，在此距离范围内拖拽鼠标进行地图平移
	panningSpeed: 10, // 每个绘画循环平移的像素数
	handlePadding: function () {
		// 如果鼠标离开canvas，地图不再平移
		if (!mouse.insideCanvas) {
			return;
		}

		if (mouse.x <= game.panningThreshold) {
			if (game.offsetX >= game.panningSpeed) {
				game.refreshBackground = true;
				game.offsetX -= game.panningSpeed;
			}
		} else if (mouse.x >= game.canvasWidth - game.panningThreshold) {
			if (game.offsetX + game.canvasWidth + game.panningSpeed <= game.currentMapImage.width) {
				game.refreshBackground = true;
				game.offsetX += game.panningSpeed;
			}
		}

		if (mouse.y <= game.panningThreshold) {
			if (game.offsetY >= game.panningSpeed) {
				game.refreshBackground = true;
				game.offsetY -= game.panningSpeed;
			}
		} else if (mouse.y >= game.canvasHeight - game.panningThreshold) {
			if (game.offsetY + game.canvasHeight + game.panningSpeed <= game.currentMapImage.height) {
				game.refreshBackground = true;
				game.offsetY += game.panningSpeed;
			}
		}

		if (game.refreshBackground) {
			// 基于平移量，更新鼠标坐标
			mouse.calculateGameCoordinates();
		}
	},
	resetArrays: function () {
		game.counter = 1;
		game.items = [];
		game.sortedItems = [];
		game.buildings = [];
		game.vehicles = [];
		game.aircraft = [];
		game.terrain = [];
		game.triggeredEvents = [];
		game.selectedItems = [];
		game.sortedItems = [];
	},
	add: function (itemDetails) {
		// 为每个单位项设置唯一的id
		if (!itemDetails.uid) {
			itemDetails.uid = game.counter++;
		}
		var item = window[itemDetails.type].add(itemDetails);
		// 将单位项加入items数组
		game.items.push(item);
		// 将单位项加入指定的单位类型数组
		game[item.type].push(item);

		if (item.type == "buildings" || item.type == "terrain") {
			game.currentMapPassableGrid = undefined;
		}
		return item;
	},
	remove: function (item) {
		// 如果已经选中该单位，解除选中
		item.selected = false;
		for (var i = game.selectedItems.length - 1; i >= 0; i--) {
			if (game.selectedItems[i].uid == item.uid) {
				game.selectedItems.splice(i, 1);
				break;
			}
		};

		// 从items数组中移除该单位
		for (var i = game.items.length - 1; i >= 0; i--) {
			if (game.items[i].uid == item.uid) {
				game.items.splice(i, 1);
				break;
			}
		};

		// 从指定的单位类型数组中移除该单位
		for (var i = game[item.type].length - 1; i >= 0; i--) {
			if (game[item.type][i].uid == item.uid) {
				game[item.type].splice(i, 1);
				break;
			}
		};

		if (item.type == "buildings" || item.type == "terrain") {
			game.currentMapPassableGrid = undefined;
		}
	},
	// 关于选中操作的代码
	selectionBorderColor: "rgba(255, 255, 0, 0.5)",
	selectionFillColor: "rgba(255, 215, 0, 0.2)",
	healthBarBorderColor: "rgba(0, 0, 0, 0.8)",
	healthBarHealthyFillColor: "rgba(0, 255, 0, 0.5)",
	healthBarDamagedFillColor: "rgba(255, 0, 0, 0.5)",
	lifeBarHeight: 5,
	clearSelection: function () {
		while (game.selectedItems.length > 0) {
			game.selectedItems.pop().selected = false;
		}
	},
	selectItem: function (item, shiftPressed) {
		// 按住Shift键并单机已选中的单位会从选择集中取消选择它
		if (shiftPressed && item.selected) {
			// 取消选中单位
			item.selected = false;
			for (var i = game.selectedItems.length - 1; i >= 0; i--) {
				if (game.selectedItems[i].uid == item.uid) {
					game.selectedItems.splice(i, 1);
					break;
				}
			};
			return;
		}

		if (item.selectable && !item.selected) {
			item.selected = true;
			game.selectedItems.push(item);
		}
	},
	drawLifeBar: function () {
		var x = this.darwingX + this.pixelOffsetX;
		var y = this.drawingY - 2 * game.lifeBarHeight;

		game.foregroundContext.fillStyle = (this.lifeCode == "healthy") ? game.healthBarHealthyFillColor : game.healthBarDamagedFillColor;

	},
	sendCommand: function (uids, details) {
		if (game.type == "singleplayer") {
			singleplayer.sendCommand(uids, details);
		} else {
			multiplayer.sendCommand(uids, details);
		}
	},
	getItemByUid: function (uid) {
		for (var i = game.items.length - 1; i >= 0; i--) {
			if (game.items[i].uid == uid) {
				return game.items[i];
			}
		};
	},
	// 从singleplayer或multiplayer对象接收命令并发送给单位
	processCommand: function (uids, details) {
		// 如果是uid类型，那么取来对应的目标对象
		var toObject;
		if (details.toUid) {
			toObject = game.getItemByUid(details.toUid);
			if (!toObject || toObject.lifeCode == "dead") {
				// toObject 不存在，无效命令
				return;
			}
		}

		for (var i in uids) {
			var uid = uids[i];
			var item = game.getItemByUid(uid);
			// 如果uid是合法单位，则为该单位设置命令
			if (item) {
				item.orders = $.extend([], details);
				if (toObject) {
					item.orders.to = toObject;
				}
			}
		};
	},
	// 与单位移动相关属性
	speedAdjustmentFactor: 1 / 64,
	turnSpeedAdjustmentFactor: 1 / 8,
	// 建筑与地形单位信息
	rebuildPassableGrid: function () {
		game.currentMapPassableGrid = $.extend(true, [], game.currentMapTerrainGrid);
		for (var i = game.items.length - 1; i >= 0; i--) {
			var item = game.items[i];
			if (item.tyep == "buildings" || item.type == "terrain") {
				for (var y = item.passableGrid.length - 1; y >= 0; y--) {
					for (var x = item.passableGrid[y].length - 1; x >= 0; x--) {
						if (item.passableGrid[y][x]) {
							game.currentMapPassableGrid[item.y + y][item.x + x] = 1;
						}
					};
				};
			}
		};
	},
	// 与玩家交互的函数
	characters: {
		"system": {
			"name": "system",
			"image":"Images/characters/system.png",
		}
	},
	showMessage: function (from, message) {
		var character = game.characters[from];
		if (character) {
			from = character.name;
			$('#callerpicture').html('<img src="' + character.image + '"/>');
			// 6秒后隐藏个人资料图片
			setTimeout(function () {
				$('#callerpicture').html("");
			}, 6000);
		}
		// 为消息板添加消息，并滚动到底部
		var existingMessage = $('#gamemessages').html();
		var newMessage = existingMessage + '<span>' + from + ':</span>' + message + '<br />';
		$('#gamemessages').html(newMessage);
		$('#gamemessages').animate({ scrollTop: $('#gamemessages').prop('scroll Height') });
	},
}