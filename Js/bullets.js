﻿var bullets = {
	list: {
		"fireball": { // 燃烧弹
			name: "fireball",
			speed: 60,
			reloadTime: 30,
			range: 8,
			damage: 10,
			spriteImages: [
				{ name: "fly", count: 1, directions: 8 },
				{ name: "explode", count: 7 },
			],
		},
		"heatseeker": { // 导弹
			name: "heatseeker",
			reloadTime: 40,
			speed: 25,
			range: 9,
			damage: 20,
			turnSpeed: 2,
			spriteImages: [
				{ name: "fly", count: 1, directions: 8 },
				{ name: "explode", count: 7 },
			],
		},
		"cannon-ball": { // 榴弹
			name: "cannon-ball",
			reloadTime: 40,
			speed: 25,
			damage: 10,
			range: 6,
			spriteImages: [
				{ name: "fly", count: 1, directions: 8 },
				{ name: "explode", count: 7 }
			],
		},
		"bullet": { // 子弹
			name: "bullet",
			damage: 5,
			speed: 50,
			range: 5,
			reloadTime: 20,
			spriteImages: [
				{ name: "fly", count: 1, directions: 8 },
				{ name: "explode", count: 3 }
			],
		},
	},
	defaults: {
		type: "bullets",
		distanceTravelled: 0,
		animationIndex: 0,
		direction: 0,
		directions: 8,
		pixelWidth: 10,
		pixelHeight: 11,
		pixelOffsetX: 5,
		pixelOffsetY: 5,
		radius: 6,
		action: "fly",
		selected: false,
		selectable: false,
		orders: { type: "fire" },
		moveTo: function (destination) {
			// 制造导弹类的武器可以在移动时缓慢转向
			if (this.turnSpeed) {
				// 找出为了集中目标而需要转向那个方向
				var newDirection = findFiringAngle(destination, this, this.directions);
				// 计算新方向和当前方向的角度差
				var difference = angleDiff(this.direction, newDirection, this.directions);
				// 计算每个动画循环导弹可以转过的角度
				var turnAmount = this.turnSpeed * game.turnSpeedAdjustmentFactor;
				if (Math.abs(difference) > turnAmount) {
					this.direction = wrapDirection(this.direction + turnAmount * Math.abs(difference) / difference, this.directions);
				}
			}

			var movement = this.speed * game.speedAdjustmentFactor;
			this.distanceTravelled += movement;

			var angleRadians = -((this.direction) / this.directions) * 2 * Math.PI;

			this.lastMovementX = -(movement * Math.sin(angleRadians));
			this.lastMovementY = -(movement * Math.cos(angleRadians));
			this.x = (this.x + this.lastMovementX);
			this.y = (this.y + this.lastMovementY);
		},
		// 击中目标
		reachedTarget: function () {
			var item = this.target;
			if (item.type == "buildings") {
				return (item.x <= this.x && item.x >= this.x - item.baseWidth / game.gridSize
					&& item.y<= this.y && item.y >= this.y - item.baseHeight/game.gridSize);
			} else if (item.type == "aircraft") {
				return (Math.pow(item.x - this.x, 2) + Math.pow(item.y - (this.y + item.pixelShadowHeight / game.gridSize), 2) < Math.pow((item.radius) / game.gridSize, 2));
			} else {
				return (Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2) < Math.pow((item.radius) / game.gridSize, 2));
			}
		},
		processOrders: function () {
			this.lastMovementX = 0;
			this.lastMovementY = 0;
			switch (this.orders.type) {
				case "fire":
					// 向目标移动，进入射程后停止
					var reachedTarget = false;
					if (this.distanceTravelled > this.range || (reachedTarget = this.reachedTarget())) {
						if (reachedTarget) {
							this.target.life -= this.damage;
							this.orders = { type: "explode" };
							this.action = "explode";
							this.animationIndex = 0;
						} else {
							// 未击中目标，炮弹消失
							game.remove(this);
						}
					} else {
						this.moveTo(this.target);
					}
					break;
			}
		},
		animate: function () {
			switch (this.action) {
				case "fly":
					var direction = wrapDirection(Math.round(this.direction), this.directions);
					this.imageList = this.spriteArray["fly-" + direction];
					this.imageOffset = this.imageList.offset;
					break;
				case "explode":
					this.imageList = this.spriteArray["explode"];
					this.imageOffset = this.imageList.offset + this.animationIndex;
					this.animationIndex++;
					if (this.animationIndex >= this.imageList.count) {
						// 炮弹完全爆炸并消失
						game.remove(this);
					}
					break;
			}
		},
		draw: function () {
			var x = (this.x * game.gridSize) - game.offsetX - this.pixelOffsetX + this.lastMovementX * game.drawingInterpolationFactor * game.gridSize;
			var y = (this.y * game.gridSize) - game.offsetY - this.pixelOffsetY + this.lastMovementY * game.drawingInterpolationFactor * game.gridSize;
			var colorOffset = 0;
			game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
		},
	},
	load: loadItem,
	add: addItem,

}