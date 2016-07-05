var debugtool = {
	isOn: true,
	draw: function () {
		// 绘制阻碍地形
		if (game.placementGrid)
			for (var y = game.placementGrid.length - 1; y >= 0; y--) {
				for (var x = game.placementGrid[y].length - 1; x >= 0; x--) {
					if (game.placementGrid[y][x]) {
						game.foregroundContext.fillStyle = "rgba(255, 128, 0, 0.2)";
						game.foregroundContext.fillRect(-game.offsetX + x * game.gridSize, -game.offsetY + y * game.gridSize, game.gridSize, game.gridSize);
					}
				};
			};
		if (game.currentMapTerrainGrid)
			for (var y = game.currentMapTerrainGrid.length - 1; y >= 0; y--) {
				for (var x = game.currentMapTerrainGrid[y].length - 1; x >= 0; x--) {
					if (game.currentMapTerrainGrid[y][x]) {
						game.foregroundContext.fillStyle = "rgba(255, 0, 0, 0.2)";
						game.foregroundContext.fillRect(-game.offsetX + x * game.gridSize, -game.offsetY + y * game.gridSize, game.gridSize, game.gridSize);;
					}
				};
			};
	},
};