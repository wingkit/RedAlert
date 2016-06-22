// 侧边栏对象
var sidebar = {
	init:function(){
		$("#scouttankbutton").click(function () {
			sidebar.constructAtStarport({ type: "vehicles", "name": "scout-tank" });
		});
		
		$("#heavytankbutton").click(function () {
			sidebar.constructAtStarport({ type: "vehicles", "name": "heavy-tank" });
		});
		$("#harvesterbutton").click(function () {
			sidebar.constructAtStarport({ type: "vehicles", "name": "harvester" });
		});
		$("#chopperbutton").click(function () {
			sidebar.constructAtStarport({ type: "aircraft", "name": "chopper" });
		});
		$("#wraithbutton").click(function () {
			sidebar.constructAtStarport({ type: "aircraft", "name": "wraith" });
		});
		
		// 初始化建筑建造按钮
		$('#starportbutton').click(function () {
			game.deployBuilding = "starport";
		});
		$('#turretbutton').click(function () {
			game.deployBuilding = "ground-turret";
		});
	},

	animate: function () {
		// 显示当前资金数目
		$('#cash').html(game.cash[game.team]);
		
		// 根据当前情况启用或禁用按钮
		this.enableSidebarButtons();

		if (game.deployBuilding) {
			// 创建可用于建造建筑的网络，以示建筑可能被放置的位置
			game.rebuildBuildableGrid();
			// 与可用于建造建筑的网格比对，以示能否在当前鼠标位置放置建筑
			var placementGrid = buildings.list[game.deployBuilding].buildableGrid;
			// 进行深度拷贝placementGrid
			game.placementGrid = $.extend(true, [], placementGrid);
			game.canDeployBuilding = true;
			for (var i = game.placementGrid.length - 1; i >= 0; i--) {
				for (var j = game.placementGrid[i].length - 1; j >= 0; j--) {
					if (game.placementGrid[i][j]
						&& (mouse.gridY + i >= game.currentLevel.mapGridHeight
						|| mouse.gridX + j >= game.currentLevel.mapGridWidth
						|| game.currentMapBuildableGrid[mouse.gridY + i][mouse.gridX + j] == 1
						|| fog.grid[game.team][mouse.gridY+i][mouse.gridX+j] == 1)) {
						game.canDeployBuilding = false;
						game.placementGrid[i][j] = 0;
					}
				};
			};
		}
	},
	enableSidebarButtons: function () {
		// 仅当相应的建筑被选中时启用按钮
		$("#gameinterfacescreen #sidebarbuttons input[type='button']").attr("disabled", true);

		// 若无建筑被选中，则不运行函数接下来的部分
		if (game.selectedItems.length == 0) {
			return;
		}
		var baseSelected = false;
		var starportSelected = false;
		// 检查基地和星港是否被选中
		for (var i = game.selectedItems.length - 1; i >= 0; i--) {
			var item = game.selectedItems[i];
			// 检查玩家是否选中了未损坏的且当前不在进行其他任务的建筑（损坏的建筑不能生产）
			if (item.type == "buildings" && item.team == game.team && item.lifeCode == "healthy" && item.action == "stand") {
				if (item.name == "base") {
					baseSelected = true;
				} else if (item.name == "starport") {
					starportSelected = true;
				}
			}
		};

		var cashBalance = game.cash[game.team];
		// 如果基地被选中，游戏需要建筑类型列表中的建筑已被加载，而且不在建造建筑阶段，玩家也有足够的资金，那么启用建筑按钮
		if (baseSelected && !game.deployBuilding) {
			if (game.currentLevel.requirements.buildings.indexOf('starport') > -1 && cashBalance >= buildings.list["starport"].cost) {
				$("#starportbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.buildings.indexOf('ground-turret') > -1 && cashBalance >= buildings.list["ground-turret"].cost) {
				$("#turretbutton").removeAttr("disabled");
			}
		}

		// 如果星港被选中，游戏需要的单位类型被加载了，而且玩家具有足够的资金，则启用单位按钮
		if (starportSelected) {
			if (game.currentLevel.requirements.vehicles.indexOf('scout-tank') > -1 && cashBalance >= vehicles.list["scout-tank"].cost) {
				$("#scouttankbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.vehicles.indexOf('heavy-tank') > -1 && cashBalance >= vehicles.list["heavy-tank"].cost) {
				$("#heavytankbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.vehicles.indexOf('harvester') > -1 && cashBalance >= vehicles.list["harvester"].cost) {
				$("#harvesterbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.aircraft.indexOf('chopper') > -1 && cashBalance >= aircraft.list["chopper"].cost) {
				$("#chopperbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.aircraft.indexOf('wraith') > -1 && cashBalance >= aircraft.list["wraith"].cost) {
				$("#wraithbutton").removeAttr("disabled");
			}
		}
	},
	constructAtStarport: function (unitDetails) {
		var starport;
		// 在选中的单位中找到第一个合适的星港
		for (var i = game.selectedItems.length - 1; i >= 0; i--) {
			var item = game.selectedItems[i];
			if (item.type == "buildings" && item.name == "starport"
				&& item.team == game.team && item.lifeCode == "healthy" && item.action == "stand") {
				starport = item;
				break;
			}
		};
		if (starport) {
			game.sendCommand([starport.uid], { type: "construct-unit", details: unitDetails });
		}
	},
	cancelDeployingBuilding: function () {
		game.deployBuilding = undefined;
	},
	finishDeployingBuilding: function () {
		var buildingName = game.deployBuilding;
		var base;
		for (var i = game.selectedItems.length - 1; i >= 0; i--) {
			var item = game.selectedItems[i];
			if (item.type == "buildings" && item.name == "base" && item.team == game.team && item.lifeCode == "healthy" && item.action == "stand") {
				base = item;
				break;
			}
		};

		if (base) {
			var buildingDetails = { type: "buildings", name: buildingName, x: mouse.gridX, y: mouse.gridY };
			game.sendCommand([base.uid], { type: "construct-building", details: buildingDetails });
		}

		// 清除deployBuilding标签
		game.deployBuilding = undefined;
	}
}