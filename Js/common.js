// 建立requestAnimationFrame 和 cancelAnimationFrame以在游戏代码中使用
(function () {
	var lastTime = 0;
	var vendors = ['ms', ';', 'webkit', 'o'];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function (callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function (id) {
			clearTimeout(id);
		};
}());

// 图像加载器
var loader = {
	loaded: true,
	loadedCount: 0, // 目前已被加载的资源数
	totalCount: 0, // 需要加载的资源总数

	init: function () {
		// 检查声音格式支持
		var mp3Support, oggSupport;
		var audio = document.createElement('audio');
		if (audio.canPlayType) {
			// 目前canPlayTime()方法返回："", "maybe"或"probably“
			mp3Support = "" != audio.canPlayType('audio/mpeg');
			oggSupport = "" != audio.canPlayType('audio/ogg; codecs="vorbis"');
		} else {
			// 浏览器不支持audio标签
			mp3Support = false;
			oggSupport = false;
		}

		// 检查是否支持ogg/mp3格式，若都不支持，设置soundFileExtn为undefined
		loader.soundFileExtn = oggSupport ? ".ogg" : mp3Support ? ".mp3" : undefined;
	},
	loadImage: function (url) {
		this.totalCount++;
		this.loaded = false;
		$('#loadingscreen').show();
		var image = new Image();
		image.src = url;
		image.onload = loader.itemLoaded;
		return image;
	},
	soundFileExtn: ".ogg",
	loadSound: function (url) {
		this.totalCount++;
		this.loaded = false;
		$('#loadingscreen').show();
		var audio = new Audio();
		audio.src = url + loader.soundFileExtn;
		audio.addEventListener("canplaythrough", loader.itemLoaded, false);
		return audio;
	},
	itemLoaded: function () {
		loader.loadedCount++;
		$('#loadingmessage').html('Loaded ' + loader.loadedCount + ' of ' + loader.totalCount);
		if (loader.loadedCount === loader.totalCount) {
			loader.loaded = true;
			$('#loadingscreen').hide();
			if (loader.onload) {
				loader.onload();
				loader.onload = undefined;
			}
		}
	},
}

// 默认的load()方法被游戏中所有的单位使用
function loadItem(name) {
	var item = this.list[name];
	// 如果单位的子画面序列已经加载，就没必要在此加载了
	if (item.spriteArray) {
		return;
	}
	item.spriteSheet = loader.loadImage('Images/' + this.defaults.type + '/' + name + '.png');
	item.spriteArray = [];
	item.spriteCount = 0;

	for (var i = 0; i < item.spriteImages.length; i++) {
		var constructImageCount = item.spriteImages[i].count;
		var constructDirectionCount = item.spriteImages[i].directions;
		if (constructDirectionCount) {
			for (var j = 0; j < constructDirectionCount; j++) {
				var constructImageName = item.spriteImages[i].name + "-" + j;
				item.spriteArray[constructImageName] = {
					name: constructImageName,
					count: constructImageCount,
					offset: item.spriteCount,
				};
				item.spriteCount += constructImageCount;
			};
		} else {
			var constructImageName = item.spriteImages[i].name;
			item.spriteArray[constructImageName] = {
				name: constructImageName,
				count: constructImageCount,
				offset: item.spriteCount,
			};
			item.spriteCount += constructImageCount;
		}
	};
	// 如果单位具有武器，同时加载武器
	if (item.weaponType) {
		bullets.load(item.weaponType);
	}

}

// 默认的add()方法被游戏中所有的单位使用
function addItem(details) {
	var item = {};
	var name = details.name;
	$.extend(item, this.defaults);
	$.extend(item, this.list[name]);
	item.life = item.hitPoints;
	$.extend(item, details);
	return item;
}

// 转向和移动的通用函数
// 根据两个物体的位置计算一个方向（满足0<=angle<directions)
function findAngle(object, unit, directions) {
	var dy = (object.y) - (unit.y);
	var dx = (object.x) - (unit.x);
	// 将正切值转换为0到directions之间的值
	var angle = wrapDirection(directions / 2 - (Math.atan2(dx, dy) * directions / (2 * Math.PI)), directions);
	return angle;
}

// 返回两个角度（满足0<=angle<directions）之间的最小值（-directions/2到+directions/2之间的值）
function angleDiff(angle1, angle2, directions) {
	if (angle1 >= directions / 2) {
		angle1 = angle1 - directions;
	}
	if (angle2 >= directions / 2) {
		angle2 = angle2 - directions;
	}
	var diff = angle2 - angle1;
	if (diff < -directions / 2) {
		diff += directions;
	}
	if (diff > directions / 2) {
		diff -= directions;
	}
	return diff;
}

// 处理方向值，使其在0到directions-1之间
function wrapDirection(direction, directions) {
	if (direction < 0) {
		direction += directions;
	}
	if (direction >= directions) {
		direction -= directions;
	}
	return direction;
}

function findFiringAngle(target, source, directions) {
	var dy = (target.y) - (source.y);
	var dx = (target.x) - (source.x);

	if (target.type == "buildings") {
		dy += target.baseWidth / 2 / game.gridSize;
		dx += target.baseHeight / 2 / game.gridSize;
	} else if (target.type == "aircraft") {
		dy -= target.pixelShadowHeight / game.gridSize;
	}

	if (source.type == "buildings") {
		dy -= source.baseWidth / 2 / game.gridSize;
		dy -= source.baseHeight / 2 / game.gridSize;
	} else if (source.type == "aircraft") {
		dy += source.pixelShadowHeight / game.gridSize;
	}

	// 将正切值转换为方向值（0~7）
	var angel = wrapDirection(directions / 2 - (Math.atan2(dx, dy) * directions / (2 * Math.PI)), directions);
	return angel;
}

// 与战斗有关的公用方法
// 是否有效的攻击单位
function isValidTarget(item) {
	// 找出不是同一队的且可以攻击的单位
	return item.team != this.team &&
		(this.canAttackLand && (item.type == "buildings" || item.type == "vehicles") ||
		(this.canAttackAir && (item.type == "aircraft")));
}

// 查找目标列表
function findTargetsInSight(increment) {
	if (!increment) {
		increment = 0;
	}
	var targets = [];
	for (var i = game.items.length - 1; i >= 0; i--) {
		var item = game.items[i];
		if (this.isValidTarget(item)) {
			if (Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2) < Math.pow(this.sight + increment, 2)) {
				targets.push(item);
			}
		}
	};

	// 按照与攻击者的距离对目标进行排序
	var attacker = this;
	targets.sort(function (a, b) {
		return (Math.pow(a.x - attacker.x, 2) + Math.pow(a.y - attacker.y, 2)) - (Math.pow(b.x - attacker.x, 2) + Math.pow(b.y - attacker.y, 2));
	});
	return targets;

}