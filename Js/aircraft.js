﻿var aircraft = {
	list: {
		// #region // list
		"chopper": {
			name: "chopper",
			cost: 900,
			pixelWidth: 40,
			pixelHeight: 40,
			pixelOffsetX: 20,
			pixelOffsetY: 20,
			weaponType: "heatseeker",
			radius: 18,
			sight: 6,
			canAttack: true,
			canAttackLand: true,
			canAttackAir: true,
			hitPoints: 50,
			speed: 25,
			turnSpeed: 4,
			pixelShadowHeight: 40,
			spriteImages: [
				{ name: "fly", count: 4, directions: 8 },
			],
		},
		"wraith": {
			name: "wraith",
			cost: 600,
			pixelWidth: 30,
			pixelHeight: 30,
			pixelOffsetX: 15,
			pixelOffsetY: 15,
			weaponType: "fireball",
			radius: 15,
			sight: 8,
			canAttack: true,
			canAttackLand: false,
			canAttackAir: true,
			hitPoints: 50,
			speed: 40,
			turnSpeed: 4,
			pixelShadowHeight: 40,
			spriteImages: [
				{ name: "fly", count: 1, directions: 8 },
			],
		},
		// #endregion

	},
	defaults: {
		type: "aircraft",
		animationIndex: 0,
		direction: 0,
		action: "fly",
		orders: { type: "float" },
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
				case "fly":
					var direction = wrapDirection(Math.round(this.direction), this.directions);
					this.imageList = this.spriteArray["fly-" + direction];
					this.imageOffset = this.imageList.offset + this.animationIndex;
					this.animationIndex++;
					if (this.animationIndex >= this.imageList.count) {
						this.animationIndex = 0;
					}
					break;
				case "teleport":
					var direction = wrapDirection(Math.round(this.direction), this.directions);
					this.imageList = this.spriteArray["fly-" + direction];
					this.imageOffset = this.imageList.offset + this.animationIndex;
					this.animationIndex++;

					if (this.animationIndex >= this.imageList.count) {
						this.animationIndex = 0;
					}

					if (!this.brightness) {
						this.brightness = 1;
					}

					this.brightness -= 0.05;
					if (this.brightness <= 0) {
						this.brightness = undefined;
						this.action = "fly";
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
			game.foregroundContext.lineWidth = 2;
			game.foregroundContext.beginPath();
			game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
			game.foregroundContext.stroke();
			game.foregroundContext.fillStyle = game.selectionFillColor;
			game.foregroundContext.fill();

			game.foregroundContext.beginPath();
			game.foregroundContext.arc(x, y + this.pixelShadowHeight, 4, 0, Math.PI * 2, false);
			game.foregroundContext.stroke();

			game.foregroundContext.beginPath();
			game.foregroundContext.moveTo(x, y);
			game.foregroundContext.lineTo(x, y + this.pixelShadowHeight);
			game.foregroundContext.stroke();
		},
		draw: function () {
			var x = (this.x * game.gridSize) - game.offsetX - this.pixelOffsetX + this.lastMovementX * game.drawingInterpolationFactor * game.gridSize;
			var y = (this.y * game.gridSize) - game.offsetY - this.pixelOffsetY - this.pixelShadowHeight + this.lastMovementY * game.drawingInterpolationFactor * game.gridSize;
			this.drawingX = x;
			this.drawingY = y;
			if (this.selected) {
				this.drawSelection();
				this.drawLifeBar();
			}
			var colorIndex = (this.team == "blue") ? 0 : 1;
			var colorOffset = colorIndex * this.pixelHeight;
			var shadowOffset = this.pixelHeight * 2;
			game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
			game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, shadowOffset, this.pixelWidth, this.pixelHeight, x, y + this.pixelShadowHeight, this.pixelWidth, this.pixelHeight);
			// 绘制出现的光圈
			if (this.brightness) {
				game.foregroundContext.beginPath();
				game.foregroundContext.arc(x + this.pixelOffsetX, y + this.pixelOffsetY, this.radius, 0, Math.PI * 2, false);
				game.foregroundContext.fillStyle = 'rgba(255, 255, 255,' + this.brightness + ')';
				game.foregroundContext.fill();
			}
		},
		isValidTarget: isValidTarget,
		findTargetsInSight:findTargetsInSight,
		processOrders: function () {
			this.lastMovementX = 0;
			this.lastMovementY = 0;
			if (this.reloadTimeLeft) {
				this.reloadTimeLeft--;
			}

			switch (this.orders.type) {
				case "float":
					var targets = this.findTargetsInSight();
					if (targets.length > 0) {
						this.orders = { type: "attack", to: targets[0] };
					}
					break;
				case "sentry":
					var targets = this.findTargetsInSight(2);
					if (targets.length > 0) {
						this.orders = { type: "attack", to: targets[0], nextOrder: this.orders };
					}
					break;
				case "hunt":
					var targets = this.findTargetsInSight(100);
					if (targets.length > 0) {
						this.orders = { type: "attack", to: targets[0], nextOrder: this.orders };
					}
					break;
				case "move":
					// 向目的地移动，知道飞行器与目的地的距离小于飞机的半径
					var distanceFromDestinationSquared = (Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2));
					if (distanceFromDestinationSquared < Math.pow(this.radius / game.gridSize, 2)) {
						this.orders = { type: "float" };
					} else {
						this.moveTo(this.orders.to);
					}
					break;
				case "attack":
					if (this.orders.to.lifeCode == "dead" || !this.isValidTarget(this.orders.to)) {
						if (this.orders.nextOrder) {
							this.orders = this.orders.nextOrder;
						} else {
							this.orders = { type: "float" };
						}
						return;
					}
					if ((Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2)) < Math.pow(this.sight, 2)) {
						// 向目标方向转向，目标进入射程后开始攻击
						var newDirection = findFiringAngle(this.orders.to, this, this.directions);
						var difference = angleDiff(this.direction, newDirection, this.directions);
						var turnAmount = this.turnSpeed * game.turnSpeedAdjustmentFactor;
						if (Math.abs(difference) > turnAmount) {
							this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
							return;
						} else {
							this.direction = newDirection;
							// 如果已经冷却完毕
							if (!this.reloadTimeLeft) {
								this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
								var angleRadians = -(Math.round(this.direction) / this.directions) * 2 * Math.PI;
								var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
								var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize) - this.pixelShadowHeight / game.gridSize;
								var bullet = game.add({ name: this.weaponType, type: "bullets", x: bulletX, y: bulletY, direction: newDirection, target: this.orders.to });
							}
						}
					} else {
						var moving = this.moveTo(this.orders.to);
					}
					break;
				case "patrol": // 巡逻
					var targets = this.findTargetsInSight(1);
					if (targets.length > 0) {
						this.orders = { type: "attack", to: targets[0], nextOrder: this.orders };
						return;
					}
					// 如果到达目的地则交换来去地址
					if ((Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2)) < Math.pow(this.radius / game.gridSize, 2)) {
						var to = this.orders.to;
						this.orders.to = this.orders.from;
						this.orders.from = to;
					} else {
						this.moveTo(this.orders.to);
					}
					break;
				case "guard":
					if (this.orders.to.lifeCode == "dead") {
						if (this.orders.nextOrder) {
							this.orders = this.orders.nextOrder;
						} else {
							this.orders = { type: "float" };
						}
						return;
					}
					if ((Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2)) < Math.pow(this.sight - 2, 2)) {
						var targets = this.findTargetsInSight(1);
						if (targets.length > 0) {
							this.orders = { type: "attack", to: targets[0], nextOrder: this.orders };
							return;
						}
					} else {
						this.moveTo(this.orders.to);
					}
					break;
			}
		},
		moveTo: function (destination) {
			// 计算飞行到目的地的方向
			var newDirection = findAngle(destination, this, this.directions);
			// 计算当前方向与新方向的差
			var difference = angleDiff(this.direction, newDirection, this.directions);
			// 计算每个动画循环飞行器转过的角度
			var turnAmount = this.turnSpeed * game.turnSpeedAdjustmentFactor;
			if (Math.abs(difference) > turnAmount) {
				this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
			} else {
				// 计算每个动画循环的飞行器应当移动的距离
				var movement = this.speed * game.speedAdjustmentFactor;
				// 计算移动距离的x和y分量
				var angleRadians = -(Math.round(this.direction) / this.directions) * 2 * Math.PI;
				this.lastMovementX = -(movement * Math.sin(angleRadians));
				this.lastMovementY = -(movement * Math.cos(angleRadians));
				this.x = (this.x + this.lastMovementX);
				this.y = (this.y + this.lastMovementY);
			}
		},
	},
	load: loadItem,
	add: addItem,
}