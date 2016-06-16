var vehicles = {
	list: {
		// #region // list
		"transport": {
			name: "transport",
			pixelWidth: 31,
			pixelHeight: 30,
			pixelOffsetX: 15,
			pixelOffsetY: 15,
			radius: 15,
			speed: 15,
			sight: 3,
			cost: 400,
			hitPoints: 100,
			turnSpeed: 2,
			spriteImages: [
				{ name: "stand", count: 1, directions: 8 },
			],
		},
		"harvester": {
			name: "harvester",
			pixelWidth: 21,
			pixelHeight: 20,
			pixelOffsetX: 10,
			pixelOffsetY: 10,
			radius: 10,
			speed: 10,
			sight: 3,
			cost: 1600,
			hitPoints: 50,
			turnSpeed: 2,
			spriteImages: [
				{ name: "stand", count: 1, directions: 8 },
			],
		},
		"scout-tank": {
			name: "scout-tank",
			canAttack: true,
			canAttackLand: true,
			canAttackAir: false,
			weaponType: "bullet",
			pixelWidth: 21,
			pixelHeight: 21,
			pixelOffsetX: 10,
			pixelOffsetY: 10,
			radius: 11,
			speed: 20,
			sight: 4,
			cost: 500,
			hitPoints: 50,
			turnSpeed: 4,
			spriteImages: [
				{ name: "stand", count: 1, directions: 8 },
			],
		},
		"heavy-tank": {
			name: "heavy-tank",
			canAttack: true,
			canAttackLand: true,
			canAttackAir: false,
			weaponType: "cannon-ball",
			pixelWidth: 30,
			pixelHeight: 30,
			pixelOffsetX: 15,
			pixelOffsetY: 15,
			radius: 13,
			speed: 20,
			sight: 5,
			cost: 1200,
			hitPoints: 50,
			turnSpeed: 4,
			spriteImages: [
				{ name: "stand", count: 1, directions: 8 },
			],
		},
		// #endregion
	},
	defaults: {
		type: "vehicles",
		animationIndex: 0,
		direction: 0,
		action: "stand",
		orders: { type: "stand" },
		selected: false,
		selectable: true,
		directions: 8,
		animate: function () {
			// 生命值大于40%的单位
			if (this.life > this.hitPoints * 0.4) {
				this.lifeCode = "healthy";
			} else if (this.life <= 0) {
				this.lifeCode = "dead";
				game.remove(this);
				return;
			} else {
				this.lifeCode = "damaged";
			}

			switch (this.action) {
				case "stand":
					var direction = wrapDirection(Math.round(this.direction), this.directions);
					this.imageList = this.spriteArray["stand-" + direction];
					this.imageOffset = this.imageList.offset + this.animationIndex;
					this.animationIndex++;
					if (this.animationIndex >= this.imageList.count) {
						this.animationIndex = 0;
					}
					break;

			}
		},
		drawLifeBar: function () {
			var x = this.drawingX;
			var y = this.drawingY - 2 * game.lifeBarHeight;

			game.foregroundContext.fillStyle = (this.lifeCode == "healthy") ?
				game.healthBarHealthyFillColor : game.healthBarDamagedFillColor;
			game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints, game.lifeBarHeight);

			game.foregroundContext.strokeStyle = game.healthBarBorderColor;
			game.foregroundContext.lineWidth = 1;
			game.foregroundContext.strokeRect(x, y, this.pixelWidth, game.lifeBarHeight);
		},
		drawSelection: function () {
			var x = this.drawingX + this.pixelOffsetX;
			var y = this.drawingY + this.pixelOffsetY;
			game.foregroundContext.strokeStyle = game.selectionBorderColor;
			game.foregroundContext.lineWidth = 1;
			game.foregroundContext.beginPath();
			game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
			game.foregroundContext.fillStyle = game.selectionFillColor;
			game.foregroundContext.fill();
			game.foregroundContext.stroke();
		},
		draw: function () {
			var x = (this.x * game.gridSize) - game.offsetX - this.pixelOffsetX + this.lastMovementX * game.drawingInterpolationFactor * game.gridSize;
			var y = (this.y * game.gridSize) - game.offsetY - this.pixelOffsetY + this.lastMovementY * game.drawingInterpolationFactor * game.gridSize;
			this.drawingX = x;
			this.drawingY = y;
			if (this.selected) {
				this.drawSelection();
				this.drawLifeBar();
			}

			var colorIndex = (this.team == "blue") ? 0 : 1;
			var colorOffset = colorIndex * this.pixelHeight;
			game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
		},
		lastMovementX: 0,
		lastMovementY: 0,
		processOrders: function () {
			this.lastMovementX = 0;
			this.lastMovementY = 0;
			switch (this.orders.type) {
				case "move":
					// 向目标位置移动， 知道距离小于车辆半径
					var distanceFromDestinationSquared = (Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2));
					if (distanceFromDestinationSquared < Math.pow(this.radius / game.gridSize, 2)) {
						// 到达目标位置时停止
						this.orders = { type: "stand" };
						return;
					} else if (distanceFromDestinationSquared < Math.pow(this.radius * 3 / game.gridSize, 2)) {
						// 距离目标3倍半径时，如果检测到接触，则停止
						this.orders = { type: "stand" };
						return;
					} else {
						if (this.colliding && (Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2)) < Math.pow(this.radius * 5 / game.gridSize, 2)) {
							// 统计目标5倍半径内的接触数量
							if (!this.orders.collisionCount) {
								this.orders.collisionCount = 1
							} else {
								this.orders.collisionCount++;
							}
							// 如果有超过30个接触，则停止
							if (this.orders.collisionCount > 30) {
								this.orders = { type: "stand" };
								return;
							}
						}
						// 试图向目标位置移动
						var moving = this.moveTo(this.orders.to);
						if (!moving) {
							// 寻径算法不能找到路径，则停止
							this.orders = { type: "stand" };
							return;
						}
					}
					break;
				case "deploy":
					// 如果油田已经被使用了，取消命令
					if (this.orders.to.lifeCode == "dead") {
						this.orders = { type: "stand" };
						return;
					}
					// 移动到油田网格的中央
					var target = { x: this.orders.to.x + 1, y: this.orders.to.y + 0.5, type: "terrain" };
					var distanceFromTargetSquared = (Math.pow(target.x - this.x, 2) + Math.pow(target.y - this.y, 2));
					if (distanceFromTargetSquared < Math.pow(this.radius * 2 / game.gridSize, 2)) {
						// 到达油田后，旋转采油车使其面向左侧（方向值为6）
						var difference = angleDiff(this.direction, 6, this.directions);
						var turnAmount = this.turnSpeed * game.turnSpeedAdjustmentFactor;
						if (Math.abs(difference) > turnAmount) {
							this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
						} else {
							// 面朝左侧之后，移除采油车，并在油田上展开一座炼油厂建筑
							game.remove(this.orders.to);
							this.orders.to.lifeCode = "dead";
							game.remove(this);
							this.lifeCode = "dead";
							game.add({ type: "buildings", name: "harvester", x: this.orders.to.x, y: this.orders.to.y, action: "deploy", team: this.team });
						}
					} else {
						var moving = this.moveTo(target);
						// 寻径算法无法找到路径，则停下
						if (!moving) {
							this.orders = { type: "stand" };
						}
					}
			}
		},
		moveTo: function (destination) {
			if (!game.currentMapPassableGrid) {
				game.rebuildPassableGrid();
			}

			// 首先寻找到目标位置的路径
			var start = [Math.floor(this.x), Math.floor(this.y)];
			var end = [Math.floor(destination.x), Math.floor(destination.y)];

			var grid = $.extend(true, [], game.currentMapPassableGrid);
			// 允许目标位置为“可通行”，以便伏算法找到一条路径
			if (destination.type == "buildings" || destination.type == "terrain") {
				grid[Math.floor(destination.y)][Math.floor(destination.x)] = 0;
			}

			var newDirection;
			// 如果车辆在地图边缘之外，直接到达目标位置
			if (start[1] < 0 || start[1] >= game.currentLevel.mapGridHeight || start[0] < 0 || start[0] >= game.currentLevel.mapGridWidth) {
				this.orders.path = [this, destination];
				newDirection = findAngle(destination, this, this.directions);
			} else {
				// 使用A*算法试图寻找到目标位置的路径
				this.orders.path = AStar(grid, start, end, "Euclidean");
				if (this.orders.path.length > 1) {
					var nextStep = { x: this.orders.path[1].x + 0.5, y: this.orders.path[1].y + 0.5 };
					newDirection = findAngle(nextStep, this, this.directions);
				} else if (start[0] == end[0] && start[1] == end[1]) {
					// 到达目标位置网格
					this.orders.path = [this, destination];
					newDirection = findAngle(destination, this, this.directions);
				} else {
					// 不存在路径
					return false;
				}
			}

			// 检查按照现有的方向运动是否会产生碰撞
			// 如果会，则改变方向
			var collisionObjects = this.checkCollisionObjects(grid);
			this.hardCollision = false;
			if (collisionObjects.length > 0) {
				this.colliding = true;

				// 生成力向量（forceVector）对象为所有接触的物体添加斥力
				var forceVector = { x: 0, y: 0 };
				// 默认的，下一步有较小的引力
				collisionObjects.push({ collisionType: "attraction", with: { x: this.orders.path[1].x + 0.5, y: this.orders.path[1].y + 0.5 } });
				for (var i = collisionObjects.length - 1; i >= 0; i--) {
					var collObject = collisionObjects[i];
					var objectAngle = findAngle(collObject.with, this, this.directions);
					var objectAngleRadians = -(objectAngle / this.directions) * 2 * Math.PI;
					var forceMagnitude;
					switch (collObject.collisionType) {
						case "hard":
							forceMagnitude = 2;
							this.hardCollision = true;
							break;
						case "soft":
							forceMagnitude = 1;
							break;
						case "attraction":
							forceMagnitude = -0.25;
							break;
					}
					forceVector.x += (forceMagnitude * Math.sin(objectAngleRadians));
					forceVector.y += (forceMagnitude * Math.cos(objectAngleRadians));
				};
				// 根据力向量得到新方向
				newDirection = findAngle(forceVector, { x: 0, y: 0 }, this.directions);
			} else {
				this.colliding = false;
			}

			// 计算转向新方向的角度量
			var difference = angleDiff(this.direction, newDirection, this.directions);
			var turnAmount = this.turnSpeed * game.turnSpeedAdjustmentFactor;

			// 根据碰撞类型转向或继续向前
			if (this.hardCollision) {
				// 硬碰撞情况下，原地转向
				if (Math.abs(difference) > turnAmount) {
					this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
				}
			} else {
				// 否知，行进同时转向
				// 向前移动，并按照需要转向
				var movement = this.speed * game.speedAdjustmentFactor;
				var angleRadians = -(Math.round(this.direction) / this.directions) * 2 * Math.PI;
				this.lastMovementX = -(movement * Math.sin(angleRadians));
				this.lastMovementY = -(movement * Math.cos(angleRadians));
				this.x = (this.x + this.lastMovementX);
				this.y = (this.y + this.lastMovementY);

				if (Math.abs(difference) > turnAmount) {
					this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
				}
			}

			return true;
		},
		checkCollisionObjects: function (grid) {
			// 计算当前路径上的下一个位置
			var movement = this.speed * game.speedAdjustmentFactor;
			var angleRadians = -(Math.round(this.direction) / this.directions) * 2 * Math.PI;
			var newX = this.x - (movement * Math.sin(angleRadians));
			var newY = this.y - (movement * Math.cos(angleRadians));

			// 下一步移动后会发生碰撞的车辆
			var collisionObjects = [];
			var x1 = Math.max(0, Math.floor(newX) - 3);
			var x2 = Math.min(game.currentLevel.mapGridWidth - 1, Math.floor(newX) + 3);
			var y1 = Math.max(0, Math.floor(newY) - 3);
			var y2 = Math.min(game.currentLevel.mapGridHeight - 1, Math.floor(newY) + 3);

			// 最远测试三步以后
			for (var j = x1; j <= x2; j++) {
				for (var i = y1; i <= y2; i++) {
					if (grid[i][j] == 1) { // 网格被阻塞
						if (Math.pow(j + 0.5 - newX, 2) + Math.pow(i + 0.5 - newY, 2) < Math.pow(this.radius / game.gridSize + 0.1, 2)) {
							// 车辆与阻塞网格间距离低于硬碰撞阈值
							collisionObjects.push({ collisionType: "hard", with: { type: "wall", x: j + 0.5, y: i + 0.5 } });
						} else if (Math.pow(j + 0.5 - newX, 2) + Math.pow(i + 0.5 - newY, 2) < Math.pow(this.radius / game.gridSize + 0.7, 2)) {
							// 车辆与阻塞网格间距离低于软碰撞阈值
							collisionObjects.push({ collisionType: "sort", with: { type: "wall", x: j + 0.5, y: i + 0.5 } });
						}
					}
				};
			};

			for (var i = game.vehicles.length - 1; i >= 0; i--) {
				var vehicle = game.vehicles[i];
				// 测试距离碰撞少于三步的车辆
				if (vehicle != this && Math.abs(vehicle.x - this.x) < 3 && Math.abs(vehicle.y - this.y) < 3) {
					if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) < Math.pow((this.radius + vehicle.radius) / game.gridSize, 2)) {
						// 车辆间的距离低于硬碰撞阈值（车辆半径之和）
						collisionObjects.push({ collisionType: "hard", with: vehicle });
					} else if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) < Math.pow((this.radius * 1.5 + vehicle.radius) / game.gridSize, 2)) {
						// 车辆间距离低于软碰撞阈值（车辆半径之和的1.5倍）
						collisionObjects.push({ collisionType: "sort", with: vehicle });
					}
				}
			};

			return collisionObjects;
		},
	},
	load: loadItem,
	add: addItem,
}