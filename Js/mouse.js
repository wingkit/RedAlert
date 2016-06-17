var mouse = {
	// 鼠标相对于canvas左上角的x、y坐标
	x: 0,
	y: 0,
	// 鼠标相对于游戏地图左上角的x、y坐标
	gameX: 0,
	gameY: 0,
	// 鼠标在游戏网格中的x、y坐标
	gridX: 0,
	gridY: 0,
	dragX: 0,
	dragY: 0,
	// 鼠标左键当前是否被按下
	buttonPressed: false,
	// 玩家是否按下鼠标左键并进行拖拽
	dragSelect: false,
	// 鼠标是否在canvas区域内
	insideCanvas: false,
	click: function (ev, rightClick) {
		// 玩家在canvas内单击鼠标
		var clickedItem = this.itemUnderMouse();
		var shiftPressed = ev.shiftKey;

		if (!rightClick) { // 玩家单击左键
			// 如果游戏处于建造模式，左击将建造建筑
			if (game.deployBuilding) {
				if (game.canDeployBuilding) {
					sidebar.finishDeployingBuilding();
				} else {
					game.showMessage("system", "Warning! Cannot deploy building here.")
				}
				return;
			}
			if (clickedItem) {
				console.log("单击左键");
				// 按住Shift键单机向已选择的单位集合中添加单位。如果没有按住Shift键，将清除选择集
				if (!shiftPressed) {
					game.clearSelection();
				}
				game.selectItem(clickedItem, shiftPressed);
			}
		} else { // 玩家单机右键
			console.log("单击右键");
			// 如果游戏处于建造模式，右击将放弃建造并退出该模式
			if (game.deployBuilding) {
				sidebar.cancelDeployingBuilding();
				return;
			}
			// 执行选择单位的攻击或移动行为
			var uids = [];
			if (clickedItem) { // 玩家在某处单击右键
				if (clickedItem.type != "terrain") {
					if (clickedItem.team != game.team) { // 玩家用鼠标右键单击敌方单位
						// 从选中的单位中挑出具备攻击能力的单位
						for (var i = game.selectedItems.length - 1; i >= 0; i--) {
							var item = game.selectedItems[i];
							if (item.team == game.team && item.canAttack) {
								uids.push(item.uid);
							}
						};
						// 接着命令它们攻击被右击的单位
						if (uids.length > 0) {
							game.sendCommand(uids, { type: "attack", toUid: clickedItem.uid });
						}
					} else { // 玩家右击友方单位
						// 从选中的单位中挑出能够移动的
						for (var i = game.selectedItems.length - 1; i >= 0; i--) {
							var item = game.selectedItems[i];
							if (item.team == game.team && (item.type == "vehicles" || item.type == "aircraft")) {
								uids.push(item.uid);
							}
						};
						// 接着命令它们守卫被单机的单位
						if (uids.length > 0) {
							game.sendCommand(uids, { type: "guard", toUid: clickedItem.uid });
						}
					}
				} else if (clickedItem.name == "oilfield") { // 玩家右击一块油田
					// 从选中单位中挑出第一辆采油车(一块油田上只能展开一辆采油车）
					for (var i = game.selectedItems.length - 1; i >= 0; i--) {
						var item = game.selectedItems[i];
						if (item.team == game.team && (item.type == "vehicles" && item.name == "harvester")) {
							uids.push(item.uid);
							break;
						}
					};
					// 接着命令它在油田上展开
					if (uids.length > 0) {
						game.sendCommand(uids, { type: "deploy", toUid: clickedItem.uid });
					}
				}
			} else { // 玩家右击地面
				// 从队伍中挑出能够移动的单位
				for (var i = game.selectedItems.length - 1; i >= 0; i--) {
					var item = game.selectedItems[i];
					if (item.team == game.team && (item.type == "vehicles" || item.type == "aircraft")) {
						uids.push(item.uid);
					}
				};
				// 接着命令它们移动到单击的位置
				if (uids.length > 0) {
					game.sendCommand(uids, { type: "move", to: { x: mouse.gameX / game.gridSize, y: mouse.gameY / game.gridSize } })
				}
			}
		}
	},
	itemUnderMouse: function () {
		for (var i = game.items.length - 1; i >= 0; i--) {
			var item = game.items[i];

			if (item.type == "buildings" || item.type == "terrain") {
				if (item.lifeCode != "dead"
					&& item.x <= (mouse.gameX) / game.gridSize
					&& item.x >= (mouse.gameX - item.baseWidth) / game.gridSize
					&& item.y <= mouse.gameY / game.gridSize
					&& item.y >= (mouse.gameY - item.baseHeight) / game.gridSize) {
					return item;
				}
			} else if (item.type == "aircraft") {
				if (item.lifeCode != "dead"
					&& Math.pow(item.x - mouse.gameX / game.gridSize, 2)
					+ Math.pow(item.y - (mouse.gameY + item.pixelShadowHeight) / game.gridSize, 2)
					< Math.pow((item.radius) / game.gridSize, 2)) {
					return item;
				}
			} else {
				if (item.lifeCode != "dead"
					&& Math.pow(item.x - mouse.gameX / game.gridSize, 2)
					+ Math.pow(item.y - mouse.gameY / game.gridSize, 2)
					< Math.pow((item.radius) / game.gridSize, 2)) {
					return item;
				}
			}
		}
	},
	draw: function () {
		if (this.dragSelect) {
			var x = Math.min(this.gameX, this.dragX);
			var y = Math.min(this.gameY, this.dragY);
			var width = Math.abs(this.gameX - this.dragX);
			var height = Math.abs(this.gameY - this.dragY);
			game.foregroundContext.strokeStyle = 'yellow';
			game.foregroundContext.strokeRect(x - game.offsetX, y - game.offsetY, width, height);
		}
		if (game.deployBuilding && game.placementGrid) {
			var buildingType = buildings.list[game.deployBuilding];
			var x = (this.gridX * game.gridSize) - game.offsetX;
			var y = (this.gridY * game.gridSize) - game.offsetY;
			for (var i = game.placementGrid.length - 1; i >= 0; i--) {
				for (var j = game.placementGrid[i].length - 1; j >= 0; j--) {
					if (game.placementGrid[i][j]) {
						game.foregroundContext.fillStyle = "rgba(0, 0, 255, 0.3)";
					} else {
						game.foregroundContext.fillStyle = "rgba(255, 0, 0, 0.3)";
					}
					game.foregroundContext.fillRect(x + j * game.gridSize, y + i * game.gridSize, game.gridSize, game.gridSize);
				};
			};
		}
	},
	calculateGameCoordinates: function () {
		mouse.gameX = mouse.x + game.offsetX;
		mouse.gameY = mouse.y + game.offsetY;

		mouse.gridX = Math.floor((mouse.gameX) / game.gridSize);
		mouse.gridY = Math.floor((mouse.gameY) / game.gridSize);

	},
	init: function () {
		var $mouseCanvas = $('#gameforegroundcanvas');
		$mouseCanvas.mousemove(function (ev) {
			var offset = $mouseCanvas.offset();
			mouse.x = ev.pageX - offset.left;
			mouse.y = ev.pageY - offset.top;

			mouse.calculateGameCoordinates();

			if (mouse.buttonPressed) {
				if (Math.abs(mouse.dragX - mouse.gameX) > 4 || Math.abs(mouse.dragY - mouse.gameY) > 4) {
					mouse.dragSelect = true;
				}
			} else {
				mouse.dragSelect = false;
			}
		});

		$mouseCanvas.click(function (ev) {
			mouse.click(ev, false);
			mouse.dragSelect = false;
			return false;
		});

		$mouseCanvas.mousedown(function (ev) {
			if (ev.which == 1) {
				mouse.buttonPressed = true;
				mouse.dragX = mouse.gameX;
				mouse.dragY = mouse.gameY;
				ev.preventDefault();
			}
			return false;
		});

		$mouseCanvas.bind('contextmenu', function (ev) {
			mouse.click(ev, true);
			return false;
		});

		$mouseCanvas.mouseup(function (ev) {
			var shiftPressed = ev.shiftKey;
			if (ev.which == 1) {
				// Left key was released
				if (mouse.dragSelect) {
					if (!shiftPressed) {
						// 没有按住Shift键
						game.clearSelection();
					}

					var x1 = Math.min(mouse.gameX, mouse.dragX) / game.gridSize;
					var y1 = Math.min(mouse.gameY, mouse.dragY) / game.gridSize;
					var x2 = Math.max(mouse.gameX, mouse.dragX) / game.gridSize;
					var y2 = Math.max(mouse.gameY, mouse.dragY) / game.gridSize;
					for (var i = game.items.length - 1; i >= 0; i--) {
						var item = game.items[i];
						if (item.type != "buildings"
							&& item.selectable
							&& item.team == game.team
							&& x1 <= item.x
							&& x2 >= item.x) {
							if ((item.type == "vehicles" && y1 <= item.y && y2 >= item.y)
								|| (
									item.type == "aircraft"
									&& (y1 <= item.y - item.pixelShadowHeight / game.gridSize)
									&& (y2 >= item.y - item.pixelShadowHeight / game.gridSize)
								)) {
								game.selectItem(item, shiftPressed);
							}
						}
					}
				}
				mouse.buttonPressed = false;
				mouse.dragSelect = false;
			}
			return false;
		});

		$mouseCanvas.mouseleave(function (ev) {
			mouse.insideCanvas = false;
		});

		$mouseCanvas.mouseenter(function (ev) {
			mouse.buttonPressed = false;
			mouse.insideCanvas = true;
		});
	},
}