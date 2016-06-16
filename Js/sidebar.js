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
			sidebar.constructAtStarport({ type: "vehicles", "name": "chopper" });
		});
		$("#wraithbutton").click(function () {
			sidebar.constructAtStarport({ type: "vehicles", "name": "wraith" });
		});
	},

	animate: function () {
		// 显示当前资金数目
		$('#cash').html(game.cash[game.team]);
		
		// 根据当前情况启用或禁用按钮
		this.enableSidebarButtons();
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
				$("#turretButton").removeAttr("disabled");
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
			if (game.currentLevel.requirements.vehicles.indexOf('chopper') > -1 && cashBalance >= vehicles.list["chopper"].cost) {
				$("#chopperbutton").removeAttr("disabled");
			}
			if (game.currentLevel.requirements.vehicles.indexOf('wraith') > -1 && cashBalance >= vehicles.list["wraith"].cost) {
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
}