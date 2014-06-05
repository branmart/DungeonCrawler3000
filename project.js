// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
    console.log(path.toString());
    this.downloadQueue.push(path);
}

AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}
AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.getAsset = function (path) {
    //console.log(path.toString());
    return this.cache[path];
}

function Animation(spriteSheet, frameWidth, frameHeight, frameDuration, frames, loop, reverse, rowStart, center, columnStart) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.frames = frames;
    this.totalTime = frameDuration * frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.reverse = reverse;
    this.rowStart = rowStart;
    this.center = center;
    this.columnStart = columnStart;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.frames - this.currentFrame() + this.center;
    var vindex = this.columnStart;
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }
    var locX = x;
    var locY = y;
    ctx.drawImage(this.spriteSheet,
                  index * this.frameWidth, vindex * this.frameHeight + this.rowStart * this.frameHeight,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth * scaleBy,
                  this.frameHeight * scaleBy);
}
Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}

function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.clickOnce = null;
    this.doubleClick = 0;
    this.mouse = null;
    this.mouseDown = null;
    this.mouseUp = null;
    this.abilitySelected = false;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.running = null;
    this.menuRunning = null;
    this.battleRunning = null;
    this.fledSuccessfully = false;
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    this.timer = new Timer();
    console.log('game initialized');
}

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.startInput = function () {
    console.log('Starting input');
    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;
        return { x: x, y: y };
    }

    var that = this;

    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
        that.clickOnce = getXandY(e);
        this.doubleClick++;
    }, false);

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousedown", function (e) {
        that.mouseDown = getXandY(e);
    }, false);
    this.ctx.canvas.addEventListener("mouseup", function (e) {
        that.mouseUp = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("keydown", function (e) {
        var i = String.fromCharCode(e.which);
        console.log(i);

        if (String.fromCharCode(e.which) === 'W') {
            that.up = true;
            that.down = false;
            that.left = false;
            that.right = false;
        }
        if (String.fromCharCode(e.which) === 'A') {
            that.up = false;
            that.down = false;
            that.left = true;
            that.right = false;
        }
        if (String.fromCharCode(e.which) === 'S') {
            that.up = false;
            that.down = true;
            that.left = false;
            that.right = false;
        }
        if (String.fromCharCode(e.which) === 'D') {
            that.up = false;
            that.down = false;
            that.left = false;
            that.right = true;
        }
        if (String.fromCharCode(e.which) === 'M') {
            if (!that.battleRunning) {
                that.running = !that.running;
                that.menuRunning = !(that.menuRunning);
            }
        }
        e.preventDefault();
    }, false);

    console.log('Input started');
}

GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
}

GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;
    this.clickOnce = this.clickOnce;
    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];

        if (!entity.removeFromWorld) {
            entity.update();
        }
    }
    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function () {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.click = null;
    this.wheel = null;
    this.up = null;
    this.left = null;
    this.down = null;
    this.right = null;
    this.menuIsUp = null;
}

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
}

Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}
function BoundingBox(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.collision = null;
    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}
BoundingBox.prototype.collideLeft = function (oth) {
    if (this.left - 10 > oth.left) return true;
    return false;
}
BoundingBox.prototype.collideTop = function (oth) {
    if (this.top - 10 > oth.top) return true;
    return false;
}
BoundingBox.prototype.collideRight = function (oth) {
    if (this.right + 25.90 < oth.right) return true;
    return false;
}
BoundingBox.prototype.collideBottom = function (oth) {
    if (this.bottom + 20 < oth.bottom) return true;
    return false;
}

BoundingBox.prototype.collideLeftObject = function (oth, direction) {
    if (this.collision === null) {
        this.collision = direction;
    }
    if (this.right + 20  > oth.left && this.top < oth.bottom && this.bottom > oth.top && this.left < oth.left) {
        this.collision = direction;
        return true;
    }
    return false;
}
BoundingBox.prototype.collideTopObject = function (oth, direction) {
    if (this.collision === null) {
        this.collision = direction;
    }
    if (this.bottom > oth.top && this.right > oth.left && this.left < oth.right && this.top < oth.top) {
        this.collision = direction;
        return true;
    }
    return false;
}
BoundingBox.prototype.collideRightObject = function (oth, direction) {
    if (this.collision === null) {
        this.collision = direction;
    }
    if (this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top && this.right > oth.right) {
        this.collision = direction;
        return true;
    }
    return false;
}
BoundingBox.prototype.collideBottomObject = function (oth, direction) {
    if (this.collision === null) {
        this.collision = direction;
    }
    if (this.top < oth.bottom && this.left < oth.right && this.right > oth.left && this.bottom > oth.bottom) {
        this.collision = direction;
        return true;
    }
    return false;
}


BoundingBox.prototype.collide = function (oth, direction) {
    if(this.collision === null) {
        this.collision = direction;
    }
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top && this.collision === direction) {
        this.collision = direction;
        return true;
    }
    return false;
}
function Circle(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
}
Circle.prototype.collideNorth = function (oth) {
    var distX = this.x - oth.x;
    var distY = this.y - oth.y;
     squaredist = (distX * distX) + (distY * distY)
     return squaredist <= (this.radius + oth.radius) * (this.radius + oth.radius);
}
Circle.prototype.collideSouth = function (oth) {
    var distX = this.x - oth.x;
    var distY = this.y - oth.y;
    squaredist = (distX * distX) + (distY * distY)
    return squaredist <= (this.radius + oth.radius) * (this.radius + oth.radius);
}
Circle.prototype.collideEast = function (oth) {
    var distX = this.x - oth.x;
    var distY = this.y - oth.y;
    squaredist = (distX * distX) + (distY * distY)
    return squaredist <= (this.radius + oth.radius) * (this.radius + oth.radius);
}
Circle.prototype.collideWest = function (oth) {
    var distX = this.x - oth.x;
    var distY = this.y - oth.y;
    squaredist = (distX * distX) + (distY * distY)
    return squaredist <= (this.radius + oth.radius) * (this.radius + oth.radius);
}
//Game Objects
function TileZero(game, enemy1, enemy2) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.enemies = [];
    this.enemies.push(enemy1);
    this.enemies.push(enemy2);
    this.battlemap = "./img/battle.png";
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.boundingbox1 = new BoundingBox(20, 20, 360, 50);
    this.boundingbox2 = new BoundingBox(550, 20, 300, 50);
    this.boundingbox3 = new BoundingBox(705, 110, 45, 60);
    this.boundingbox4 = new BoundingBox(415, 625, 100, 100);

    this.circle1 = new Circle(100, 120, 50);
    Entity.call(this, game, 20, 20);
}

TileZero.prototype = new Entity();
TileZero.prototype.constructor = TileZero;

TileZero.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingBoxes = [];
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.boundingBoxes.push(this.boundingbox);
    this.boundingbox1 = new BoundingBox(20, 20, 100, 760);
    this.boundingBoxes.push(this.boundingbox1);
    this.boundingbox2 = new BoundingBox(550, 20, 300, 50);
    this.boundingBoxes.push(this.boundingbox2);
    this.boundingbox3 = new BoundingBox(705, 110, 45, 60);
    this.boundingBoxes.push(this.boundingbox3);
    this.boundingbox4 = new BoundingBox(415, 625, 100, 100);
    this.boundingBoxes.push(this.boundingbox4);
    this.BattleTime = 5;
    /*this.NorthTile = this.game.platforms[1];
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;*/

    this.NorthTile = null;
    this.EastTile = this.game.platforms[1];
    this.SouthTile = this.game.platforms[3];
    this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileZero.prototype.draw = function (ctx) {

    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/DungeonStart.png"), this.x, this.y, 760, 760);
    ctx.strokeStyle = "red";
    var i;
    for (i = 0; i < this.boundingBoxes.length; i++) {
        ctx.strokeRect(this.boundingBoxes[i].x, this.boundingBoxes[i].y, this.boundingBoxes[i].width, this.boundingBoxes[i].height);
    }
    var i;
    var j;
    //left side
    for (i = this.boundingbox1.x; i < this.boundingbox1.width; i += this.boundingbox1.width/2) {
        for(j = this.boundingbox1.y; j < this.boundingbox1.height; j +=  this.boundingbox1.height/10)
            ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"),i, j, this.boundingbox1.width/2, this.boundingbox1.height/10);
    }
    var k;
    //bottom first portion
    for (k = 0; k < 4; k++) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 120+k*60, 705, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    }
    //second portion
    for (k = 0; k < 5; k++) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 500 + k * 55, 705, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    }

    //right corner
    for (k = 0; k < 5; k++) {
        for (j = 0; j < 4; j++)
            ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 500 + k * 55, 20+j*65, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    }


    ctx.beginPath();
    //ctx.arc(this.circle1.x, this.circle1.y, this.circle1.radius, 0 * Math.PI, 2 * Math.PI);
    ctx.stroke();

}

function TileOne(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    
    this.boundingbox1 = new BoundingBox(20, 20, 275, 300);
    this.boundingbox2 = new BoundingBox(550, 20, 300, 50);
    this.boundingbox3 = new BoundingBox(705, 110, 45, 60);
    this.boundingbox4 = new BoundingBox(415, 625, 100, 100);

    Entity.call(this, game, 20, 20);
}

TileOne.prototype = new Entity();
TileOne.prototype.constructor = TileZero;

TileOne.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);

    this.boundingbox1 = new BoundingBox(20, 20, 275, 300);
    this.boundingbox2 = new BoundingBox(400, 20, 350, 200);
    this.boundingbox3 = new BoundingBox(705, 110, 45, 60);
    this.boundingbox4 = new BoundingBox(21, 410, 300, 400);

    this.NorthTile = this.game.platforms[3];
    this.EastTile = null;
    this.SouthTile = this.game.platforms[0];
    this.WestTile = this.game.platforms[2];
    Entity.prototype.update.call(this);
}

TileOne.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/DungeonMap.png"), this.x, this.y, 760, 760);


}

function TileTwo(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);

    this.boundingbox1 = new BoundingBox(20, 20, 200, 760);
    this.boundingbox2 = new BoundingBox(20, 20, 760, 275);
    this.boundingbox3 = new BoundingBox(20, 500, 760, 300);


    Entity.call(this, game, 20, 20);
}

TileTwo.prototype = new Entity();
TileTwo.prototype.constructor = TileZero;

TileTwo.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);

    this.boundingbox1 = new BoundingBox(20, 20, 200, 760);
    this.boundingbox2 = new BoundingBox(20, 20, 760, 275);
    this.boundingbox3 = new BoundingBox(20, 500, 760, 300);


    this.NorthTile = null;
    this.EastTile = this.game.platforms[1];
    this.SouthTile = null;
    this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileTwo.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/DungeonRoom.png"), this.x, this.y, 760, 760);
}

function TileThree(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.boundingbox1 = new BoundingBox(20, 20, 300, 760);
    this.boundingbox2 = new BoundingBox(20, 20, 760, 275);
    this.boundingbox3 = new BoundingBox(500, 20, 275, 760);
    Entity.call(this, game, 20, 20);
}

TileThree.prototype = new Entity();
TileThree.prototype.constructor = TileZero;

TileThree.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.boundingbox1 = new BoundingBox(20, 20, 275, 760);
    this.boundingbox2 = new BoundingBox(20, 20, 760, 275);
    this.boundingbox3= new BoundingBox(500, 20, 275, 760);





    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = this.game.platforms[1];
    this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileThree.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/BossMap.png"), this.x, this.y, 760, 760);
}

function TileFour(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileFour.prototype = new Entity();
TileFour.prototype.constructor = TileZero;

TileFour.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = this.game.platforms[1];
    this.EastTile = this.game.platforms[5];
    this.SouthTile = this.game.platforms[7];
    this.WestTile = this.game.platforms[3];
    Entity.prototype.update.call(this);
}

TileFour.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}

function TileFive(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileFive.prototype = new Entity();
TileFive.prototype.constructor = TileZero;

TileFive.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = this.game.platforms[2];
    this.EastTile = null;
    this.SouthTile = this.game.platforms[8];
    this.WestTile = this.game.platforms[4];
    Entity.prototype.update.call(this);
}

TileFive.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/snow.jpg"), this.x, this.y, 760, 760);
}

function TileSix(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileSix.prototype = new Entity();
TileSix.prototype.constructor = TileZero;

TileSix.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = this.game.platforms[3];
    this.EastTile = this.game.platforms[7];
    this.SouthTile = null;
    this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileSix.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/snow.jpg"), this.x, this.y, 760, 760);
}

function TileSeven(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileSeven.prototype = new Entity();
TileSeven.prototype.constructor = TileZero;

TileSeven.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = this.game.platforms[4];
    this.EastTile = this.game.platforms[8];
    this.SouthTile = null;
    this.WestTile = this.game.platforms[6];
    Entity.prototype.update.call(this);
}

TileSeven.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}

function TileEight(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileEight.prototype = new Entity();
TileEight.prototype.constructor = TileEight;

TileEight.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = this.game.platforms[5];
    this.EastTile = null
    this.SouthTile = null;
    this.WestTile = this.game.platforms[7];
    Entity.prototype.update.call(this);
}

TileEight.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}
function Menu(game, x, y, hero) {
    this.abilityOneDescription = hero.currentClass.abilityOneDescription;
    this.abilityTwoDescription = hero.currentClass.abilityTwoDescription;
    this.abilityThreeDescription = "";
    this.abilityFourDescription = "";
    this.abilityFiveDescription = "";
    this.abilitySixDescription = "";
    this.abilityOne = hero.currentClass.abilityOne;
    this.abilityTwo = hero.currentClass.abilityTwo;
    this.abilityThree = null;
    this.abilityFour = null;
    this.abilityFive = null;
    this.abilitySix = null;
    this.abilityOneDisplay = hero.currentClass.abilityOneDisplay;
    this.abilityTwoDisplay = hero.currentClass.abilityTwoDisplay;
    this.abilityThreeDisplay = null;
    this.abilityFourDisplay = null;
    this.abilityFiveDisplay = null;
    this.abilitySixDisplay = null;
    this.currentAbility = null;
    this.currentAbilityDescription = "";
    this.currentAbilityDisplay = null;
    this.playerhero = hero;
    this.heroOneX = hero.x;
    this.heroOneY = hero.y;
    Entity.call(this, game, x, y);

}

Menu.prototype = new Entity();
Menu.prototype.constructor = Menu;

Menu.prototype.reset = function () {
    this.game.menuRunning = false;
}
Menu.prototype.resetAbilities = function () {
    this.abilityOneDescription = this.playerhero.currentClass.abilityOneDescription;
    this.abilityTwoDescription = this.playerhero.currentClass.abilityTwoDescription;
    this.abilityThreeDescription = "";
    this.abilityFourDescription = "";
    this.abilityFiveDescription = "";
    this.abilitySixDescription = "";
    this.abilityOne = this.playerhero.currentClass.abilityOne;
    this.abilityTwo = this.playerhero.currentClass.abilityTwo;
    this.abilityThree = null;
    this.abilityFour = null;
    this.abilityFive = null;
    this.abilitySix = null;
    this.abilityOneDisplay = this.playerhero.currentClass.abilityOneDisplay;
    this.abilityTwoDisplay = this.playerhero.currentClass.abilityTwoDisplay;
    this.abilityThreeDisplay = null;
    this.abilityFourDisplay = null;
    this.abilityFiveDisplay = null;
    this.abilitySixDisplay = null;
}
Menu.prototype.update = function () {
    if (!this.game.menuRunning && !this.game.battleRunning) {
        this.playerhero.x = this.playerhero.currentX;
        this.playerhero.y = this.playerhero.currentY;
        this.playerhero.currentClass.hp = this.playerhero.currentClass.hp;
        this.playerhero.currentClass.mp = this.playerhero.currentClass.mp;
    }
    if (this.game.menuRunning) {
        //class change
        if (this.game.mouse) {
            console.log("(" + this.game.mouse.x + "," + this.game.mouse.y + ")");
        }
        if (this.game.click) {
            //gunner
            if (this.game.click.x > 30 && this.game.click.x < 120 && this.game.click.y > 80 && this.game.click.y < 120) {
                this.playerhero.changeClass(0);
                this.resetAbilities();
            }//black mage
            else if (this.game.click.x > 130 && this.game.click.x < 220 && this.game.click.y > 80 && this.game.click.y < 120) {
                this.playerhero.changeClass(1);
                this.resetAbilities();
            } //white mage
            else if (this.game.click.x > 230 && this.game.click.x < 320 && this.game.click.y > 80 && this.game.click.y < 120) {
                this.playerhero.changeClass(2);
                this.resetAbilities();
            } //Samurai
            else if (this.game.click.x > 330 && this.game.click.x < 420 && this.game.click.y > 80 && this.game.click.y < 120) {
                this.playerhero.changeClass(3);
                this.resetAbilities();
            } //Warrior
            else if (this.game.click.x > 30 && this.game.click.x < 120 && this.game.click.y > 130 && this.game.click.y < 170) {
                this.playerhero.changeClass(4);
                this.resetAbilities();
            }//sixth
            else if (this.game.click.x > 130 && this.game.click.x < 220 && this.game.click.y > 130 && this.game.click.y < 170) {
                this.playerhero.changeClass(5);
                this.resetAbilities();
            }//seventh
            else if (this.game.click.x > 230 && this.game.click.x < 320 && this.game.click.y > 130 && this.game.click.y < 170) {
                this.playerhero.changeClass(6);
                this.resetAbilities();
            } //eight
            else if (this.game.click.x > 330 && this.game.click.x < 420 && this.game.click.y > 130 && this.game.click.y < 170) {
                this.playerhero.changeClass(7);
                this.resetAbilities();
            }
        }
    }
        //abilities list
    if (this.game.click) {
            if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 25 && this.game.click.y < 100) {
                if (this.playerhero.currentClass.abilityOneAP === this.playerhero.currentClass.abilityOneAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityOne;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityOneDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityOneDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityOneAP < this.playerhero.currentClass.abilityOneAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityOneAP += 1;
                    this.playerhero.currentClass.ap--;

                }

            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 101 && this.game.click.y < 176) {
                if (this.playerhero.currentClass.abilityTwoAP === this.playerhero.currentClass.abilityTwoAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityTwo;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityTwoDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityTwoDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityTwoAP < this.playerhero.currentClass.abilityTwoAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityTwoAP += 1;
                    this.playerhero.currentClass.ap--;
                }

            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 177 && this.game.click.y < 251) {
                if (this.playerhero.currentClass.abilityThreeAP === this.playerhero.currentClass.abilityThreeAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityThree;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityThreeDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityThreeDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityThreeAP < this.playerhero.currentClass.abilityThreeAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityThreeAP += 1;
                    this.playerhero.currentClass.ap--;
                }



            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 252 && this.game.click.y < 326) {
                if (this.playerhero.currentClass.abilityFourAP === this.playerhero.currentClass.abilityFourAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityFour;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityFourDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityFourDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityFourAP < this.playerhero.currentClass.abilityFourAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityFourAP += 1;
                    this.playerhero.currentClass.ap--;
                }

            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 327 && this.game.click.y < 401) {
                if (this.playerhero.currentClass.abilityFiveAP === this.playerhero.currentClass.abilityFiveAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityFive;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityFiveDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityFiveDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityFiveAP < this.playerhero.currentClass.abilityFiveAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityFiveAP += 1;
                    this.playerhero.currentClass.ap--;
                }



            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 402 && this.game.click.y < 476) {
                if (this.playerhero.currentClass.abilitySixAP === this.playerhero.currentClass.abilitySixAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilitySix;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilitySixDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilitySixDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilitySixAP < this.playerhero.currentClass.abilitySixAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilitySixAP += 1;
                    this.playerhero.currentClass.ap--;
                }


            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 477 && this.game.click.y < 551) {
                if (this.playerhero.currentClass.abilitySevenAP === this.playerhero.currentClass.abilitySevenAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilitySeven;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilitySevenDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityTSevenDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilitySevenAP < this.playerhero.currentClass.abilitySevenAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilitySevenAP += 1;
                    this.playerhero.currentClass.ap--;
                }



            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 552 && this.game.click.y < 626) {
                if (this.playerhero.currentClass.abilityEightAP === this.playerhero.currentClass.abilityEightAPNeeded) {
                    this.currentAbility = this.playerhero.currentClass.abilityEight;
                    this.currentAbilityDescription = this.playerhero.currentClass.abilityEightDescription;
                    this.currentAbilityDisplay = this.playerhero.currentClass.abilityEightDisplay;
                    this.game.abilitySelected = true;
                } else if (this.playerhero.currentClass.abilityEightAP < this.playerhero.currentClass.abilityEightAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityEightAP += 1;
                    this.playerhero.currentClass.ap--;
                }

                //support Abilities
            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 627 && this.game.click.y < 701) {
                if  (this.playerhero.currentClass.abilityNineAP < this.playerhero.currentClass.abilityNineAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityNineAP += 1;
                    this.playerhero.currentClass.ap--;
                } else  if  (this.playerhero.currentClass.abilityNineAP === this.playerhero.currentClass.abilityNineAPNeeded) {
                    this.playerhero.currentClass.abilityNine(this.playerhero.currentClass);
                }


            } else if (this.game.click.x > 415 && this.game.click.x < 415 + 365 && this.game.click.y > 701 && this.game.click.y < 776) {
                if (this.playerhero.currentClass.abilityTenAP < this.playerhero.currentClass.abilityTenAPNeeded && this.playerhero.currentClass.ap > 0) {
                    this.playerhero.currentClass.abilityTenAP += 1;
                    this.playerhero.currentClass.ap--;
                } else  if  (this.playerhero.currentClass.abilityTenAP < this.playerhero.currentClass.abilityTenAPNeeded) {
                    this.playerhero.currentClass.abilityTen(this.playerhero.currentClass);
                }


            }
        }
        //abilities being used
        if (this.game.click) {
            //1
            if (this.game.click.x > 25 && this.game.click.x < 215 && this.game.click.y > 175 && this.game.click.y < 275 && this.game.abilitySelected) {
                this.playerhero.abilityOne = this.currentAbility;
                this.playerhero.abilityOneDescription = this.currentAbilityDescription;
                this.playerhero.abilityOneDisplay = this.currentAbilityDisplay;
                this.abilityOneDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;
            }//3
            else if (this.game.mouse.x > 25 && this.game.mouse.x < 215 && this.game.mouse.y > 275 && this.game.mouse.y < 375 && this.game.abilitySelected) {
                this.playerhero.abilityThree = this.currentAbility;
                this.playerhero.abilityThreeDescription = this.currentAbilityDescription;
                this.playerhero.abilityThreeDisplay = this.currentAbilityDisplay;

                this.abilityThreeDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;
            }//5
            else if (this.game.mouse.x > 25 && this.game.mouse.x < 215 && this.game.mouse.y > 375 && this.game.mouse.y < 475 && this.game.abilitySelected) {
                this.playerhero.abilityFive = this.currentAbility;
                this.playerhero.abilityFiveDescription = this.currentAbilityDescription;
                this.playerhero.abilityFiveDisplay = this.currentAbilityDisplay;

                this.abilityFiveDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;
            }//2
            else if (this.game.mouse.x > 210 && this.game.mouse.x < 410 && this.game.mouse.y > 175 && this.game.mouse.y < 275 && this.game.abilitySelected) {
                this.playerhero.abilityTwo = this.currentAbility;
                this.playerhero.abilityTwoDescription = this.currentAbilityDescription;
                this.playerhero.abilityTwoDisplay = this.currentAbilityDisplay;

                this.abilityTwoDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;
            }//4
            else if (this.game.mouse.x > 210 && this.game.mouse.x < 410 && this.game.mouse.y > 275 && this.game.mouse.y < 375 && this.game.abilitySelected) {
                this.playerhero.abilityFour = this.currentAbility;
                this.playerhero.abilityFourDescription = this.currentAbilityDescription;
                this.playerhero.abilityFourDisplay = this.currentAbilityDisplay;

                this.abilityFourDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;

            }//6
            else if (this.game.mouse.x > 210 && this.game.mouse.x < 410 && this.game.mouse.y > 375 && this.game.mouse.y < 475 && this.game.abilitySelected) {
                this.playerhero.abilitySix = this.currentAbility;
                this.playerhero.abilitySixDescription = this.currentAbilityDescription;
                this.playerhero.abilitySixDisplay = this.currentAbilityDisplay;

                this.abilitySixDescription = this.currentAbilityDescription;
                this.game.abilitySelected = false;

            }
        }
    Entity.prototype.update.call(this);

}
Menu.prototype.drawAbilities = function (ctx) {
    var x = 25;
    var y = 440;
    var z = 40;
    ctx.fillStyle = "black";
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 25 && this.game.clickOnce.y < 25 + 75) {
            ctx.fillStyle = "red";
        }
    }

    if (this.game.mouse && !this.game.abilitySelected) {
        if (this.game.mouse.x > 415 && this.game.mouse.x < 415 + 365 && this.game.mouse.y > 25 && this.game.mouse.y < 25 + 75) {

            ctx.fillText("A normal Attack", y, x + z);
        } else {
            ctx.fillText(this.playerhero.currentClass.abilityOneDescription, y, x + z);

        }
    } else {
        ctx.fillText(this.playerhero.currentClass.abilityOneDescription, y, x + z);

    }
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityOneAP + "/" + this.playerhero.currentClass.abilityOneAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 101 && this.game.clickOnce.y < 176) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilityTwoDescription, y, x + z);
    ctx.fillStyle = "black";
    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityTwoAP + "/" + this.playerhero.currentClass.abilityTwoAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 177 && this.game.clickOnce.y < 251) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilityThreeDescription, y, x + z);
    ctx.fillStyle = "black";
    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityThreeAP + "/" + this.playerhero.currentClass.abilityThreeAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 252 && this.game.clickOnce.y < 362) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilityFourDescription, y, x + z);
    ctx.fillStyle = "black";
    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityFourAP + "/" + this.playerhero.currentClass.abilityFourAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 327 && this.game.clickOnce.y < 401) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilityFiveDescription, y, x + z);
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityFiveAP + "/" + this.playerhero.currentClass.abilityFiveAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 402 && this.game.clickOnce.y < 476) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilitySixDescription, y, x + z);
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilitySixAP + "/" + this.playerhero.currentClass.abilitySixAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 477 && this.game.clickOnce.y < 551) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilitySevenDescription, y, x + z);
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilitySevenAP + "/" + this.playerhero.currentClass.abilitySevenAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.clickOnce) {
        if (this.game.clickOnce.x > 415 && this.game.clickOnce.x < 415 + 365 && this.game.clickOnce.y > 552 && this.game.clickOnce.y < 626) {
            ctx.fillStyle = "red";
        }
    }
    ctx.fillText(this.playerhero.currentClass.abilityEightDescription, y, x + z);
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityEightAP + "/" + this.playerhero.currentClass.abilityEightAPNeeded, y, x + z + 30);
    x += 75;
    if (this.game.mouse) {
        if (this.game.mouse.x > 415 && this.game.mouse.x < 415 + 365 && this.game.mouse.y > 627 && this.game.mouse.y < 701) {
            ctx.fillText("A support Ability", y, x + z);
        } else {
            ctx.fillText(this.playerhero.currentClass.abilityNineDescription, y, x + z);

        }
    } else {
        ctx.fillText(this.playerhero.currentClass.abilityNineDescription, y, x + z);

    }
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityNineAP + "/" + this.playerhero.currentClass.abilityNineAPNeeded, y, x + z + 30);
    x += 75;

    if (this.game.mouse) {
        if (this.game.mouse.x > 415 && this.game.mouse.x < 415 + 365 && this.game.mouse.y > 702 && this.game.mouse.y < 776) {
            ctx.fillText("A support Ability", y, x + z);
        } else {
            ctx.fillText(this.playerhero.currentClass.abilityTenDescription, y, x + z);

        }
    } else {
        ctx.fillText(this.playerhero.currentClass.abilityTenDescription, y, x + z);

    }
    ctx.fillStyle = "black";

    ctx.fillText("AP Needed: " + this.playerhero.currentClass.abilityTenAP + "/" + this.playerhero.currentClass.abilityTenAPNeeded, y, x + z + 30);
    x += 75;
}
Menu.prototype.draw = function (ctx) {

    if (this.game.menuRunning) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/hell4.jpg"), this.x, this.y, 750, 750);

        ctx.lineWidth = 10;
        ctx.strokeStyle = "white";
        ctx.font = "24pt Impact";
        ctx.fillStyle = "white";
        
        this.drawAbilities(ctx);

        for (var i = 25; i < 750;) {
            ctx.strokeRect(415, i, 365, 75);
            i = i + 75;
        }
        ctx.strokeRect(25, 25, 400, 150); //character area

        ctx.save();

        for (var o = 0; o < 2; o++) {
            for (var i = 0; i < 4; i++) {
                ctx.strokeRect(25 + (i * 100), 75 + (o * 50), 100, 50);
            }
        }

        if (this.game.mouse) {
            //gunner
            if (this.game.mouse.x > 30 && this.game.mouse.x < 120 && this.game.mouse.y > 80 && this.game.mouse.y < 120) {
                ctx.fillText(this.game.classSystem[0].name, 140, 60);
            }//black mage
            else if (this.game.mouse.x > 130 && this.game.mouse.x < 220 && this.game.mouse.y > 80 && this.game.mouse.y < 120) {
                ctx.fillText(this.game.classSystem[1].name, 140, 60);
            } //white mage
            else if (this.game.mouse.x > 230 && this.game.mouse.x < 320 && this.game.mouse.y > 80 && this.game.mouse.y < 120) {
                ctx.fillText(this.game.classSystem[2].name, 140, 60);
            } //Samurai
            else if (this.game.mouse.x > 330 && this.game.mouse.x < 420 && this.game.mouse.y > 80 && this.game.mouse.y < 120) {
                ctx.fillText(this.game.classSystem[3].name, 140, 60);
            } //Warrior
            else if (this.game.mouse.x > 30 && this.game.mouse.x < 120 && this.game.mouse.y > 130 && this.game.mouse.y < 170) {
                ctx.fillText(this.game.classSystem[4].name, 140, 60);
            }//sixth
            else if (this.game.mouse.x > 130 && this.game.mouse.x < 220 && this.game.mouse.y > 130 && this.game.mouse.y < 170) {
                ctx.fillText(this.game.classSystem[5].name, 140, 60);
            }//seventh
            else if (this.game.mouse.x > 230 && this.game.mouse.x < 320 && this.game.mouse.y > 130 && this.game.mouse.y < 170) {
                ctx.fillText(this.game.classSystem[6].name, 140, 60);
            } //eight
            else if (this.game.mouse.x > 330 && this.game.mouse.x < 420 && this.game.mouse.y > 130 && this.game.mouse.y < 170) {
                ctx.fillText(this.game.classSystem[7].name, 140, 60);
            } else {
                ctx.fillText(this.playerhero.currentClass.name, 140, 60);
            }
        } 
        this.game.classSystem[0].draw(ctx, 50, 80, 1.25);
        //ctx.fillText(this.game.classSystem[0].name, 120, 60);
        this.game.classSystem[1].draw(ctx, 150, 80, 1.25);
        //ctx.fillText(this.game.classSystem[1].name, 230, 60);
        this.game.classSystem[2].draw(ctx, 250, 80, 1.25);

        //ctx.fillText(this.game.classSystem[2].name, 120, 100);
        this.game.classSystem[3].draw(ctx, 350, 80, 1.25);
        //ctx.fillText(this.game.classSystem[3].name, 230, 100);

        this.game.classSystem[4].draw(ctx, 50, 130, 1.25);
        //ctx.fillText(this.game.classSystem[4].name, 120, 140);
        this.game.classSystem[5].draw(ctx, 150, 130, 1.25);
        this.game.classSystem[6].draw(ctx, 250, 130, 1.25);
        this.game.classSystem[7].draw(ctx, 350, 130, 1.25);
        ctx.restore();
        //ability boxes
        ctx.fillStyle = "black";
        ctx.strokeRect(25, 175, 400, 300); //main box 
        ctx.strokeRect(25, 175, 190, 100); // 1
        ctx.fillText(this.abilityOneDescription, 25, 225);
        ctx.strokeRect(25, 275, 190, 100); // 3
        ctx.fillText(this.abilityThreeDescription, 25, 325);
        ctx.strokeRect(25, 375, 190, 100); // 5
        ctx.fillText(this.abilityFiveDescription, 25, 425);
        ctx.strokeRect(210, 175, 210, 100); // 2
        ctx.fillText(this.abilityTwoDescription, 225, 225);
        ctx.strokeRect(210, 275, 210, 100); // 4
        ctx.fillText(this.abilityFourDescription, 225, 325);
        ctx.strokeRect(210, 375, 210, 100); // 6
        ctx.fillText(this.abilitySixDescription, 225, 425);


        ctx.strokeRect(25, 475, 400, 300); //stats area

        ctx.fillText("Level: " + this.playerhero.currentClass.level, 225, 525);
        ctx.fillText("EXP: " + this.playerhero.currentClass.exp + "/" + this.playerhero.currentClass.expMax, 225, 600);
        ctx.fillText("AP: " + this.playerhero.currentClass.ap, 225, 635);

        ctx.fillText("HP: " + this.playerhero.currentClass.hp + "/" + this.playerhero.currentClass.hpMax, 25, 525);
        ctx.fillText("MP: " + this.playerhero.currentClass.mp + "/" + this.playerhero.currentClass.mpMax, 25, 560);

        ctx.fillText("Strength: " + this.playerhero.currentClass.phystr, 25, 600);
        ctx.fillText("Defense: " + this.playerhero.currentClass.phydef, 25, 635);
        ctx.fillText("Magic: " + this.playerhero.currentClass.magstr, 25, 670);
        ctx.fillText("Magic Defense: " + this.playerhero.currentClass.magdef, 25, 705);

        
    }


}

function Battle(game, x, y, one) {
    this.battleTime = 0;
    this.heroOne = one;
    this.selectedEnemy = null;
    this.firstEnemy = this.heroOne.currentTile.enemies[0];
    this.secondEnemy = this.heroOne.currentTile.enemies[1];
    this.thirdEnemy = this.heroOne.currentTile.enemies[2];
    this.heroOneX = one.x;
    this.heroOneY = one.y;
    this.board = [];
    for (var i = 0; i < 3; i++) {
        this.board.push([]);
        for (var j = 0; j < 10; j++) {
            this.board[i].push(0);
        }
    }
    this.grid = true;
    this.actionLabel = 0;
    this.actionTime = 0;
    this.clickX = 0;
    this.clickY = 0;
    Entity.call(this, game, x, y);
}

Battle.prototype = new Entity();
Battle.prototype.constructor = Battle;

Battle.prototype.reset = function () {
    this.game.battleRunning = false;
}
Battle.prototype.resetAbilities = function () {

    if (this.heroOne.currentClass.abilityOneAP === this.heroOne.currentClass.abilityOneAPNeeded) {
        this.abilityOne = this.heroOne.currentClass.abilityOne;
        this.abilityOneDescription = this.heroOne.currentClass.abilityOneDescription;
        this.abilityOneDisplay = this.heroOne.currentClass.abilityOneDisplay;
    }
    if (this.heroOne.currentClass.abilityTwoAP === this.heroOne.currentClass.abilityTwoAPNeeded) {
        this.abilityTwo = this.heroOne.currentClass.abilityTwo;
        this.abilityTwoDescription = this.heroOne.currentClass.abilityTwoDescription;
        this.abilityTwoDisplay = this.heroOne.currentClass.abilityTwoDisplay;


    }
    if (this.heroOne.currentClass.abilityThreeAP === this.heroOne.currentClass.abilityThreeAsPNeeded) {
        this.abilityThree = this.heroOne.currentClass.abilityThree;
        this.abilityThreeDescription = this.heroOne.currentClass.abilityThreeDescription;
        this.abilityThreeDisplay = this.heroOne.currentClass.abilityThreeDisplay;

    }
    if (this.heroOne.currentClass.abilityFourAP === this.heroOne.currentClass.abilityFourAPNeeded) {
        this.abilityFour = this.heroOne.currentClass.abilityFour;
        this.abilityFourDescription = this.heroOne.currentClass.abilityFourDescription;
        this.abilityFour = this.heroOne.currentClass.abilityFour;
    }
    if (this.heroOne.currentClass.abilityFiveAP === this.heroOne.currentClass.abilityFiveAPNeeded) {
        this.abilityFive = this.heroOne.currentClass.abilityFive;
        this.abilityFiveDescription = this.heroOne.currentClass.abilityFiveDescription;
        this.abilityFiveDisplay = this.heroOne.currentClass.abilityFiveDisplay;

    }
    if (this.heroOne.currentClass.abilitySixAP === this.heroOne.currentClass.abilitySixAPNeeded) {
        this.abilitySix = this.heroOne.currentClass.abilitySix;
        this.abilitySixDescription = this.heroOne.currentClass.abilitySixDescription;
        this.abilitySixDisplay = this.heroOne.currentClass.abilitySixDisplay;
    }
}
Battle.prototype.update = function () {
    if (this.game.fledSuccessfully) {
        this.battleTime = 0;
        this.game.fledSuccessfully = false;
    }
    if (this.battleTime > this.heroOne.currentTile.BattleTime) {
        this.game.battleRunning = true;
    }
    if (this.game.battleRunning) {
        if (this.game.click) {
            var x = this.game.click.x;
            var y = this.game.click.y;
        }
        if (this.game.click && this.game.battleRunning) {
            var i = 0;
            if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 0) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 0) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(0);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 1) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 1) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(1);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 2) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 2) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(2);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 3) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 3) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(3);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 4) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 4) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(4);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 5) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 5) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(5);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 6) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 6) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(6);
                this.resetAbilities();
            } else if (this.game.click.x > 20 + (760 / this.game.classSystem.length * 7) && this.game.click.x < 20 + (760 / this.game.classSystem.length * 7) + 760 / this.game.classSystem.length && this.game.click.y > 560 && this.game.click.y < 560 + 65) {
                this.heroOne.changeClass(7);
                this.resetAbilities();
            }
            while (this.selectedEnemy === null && i < this.heroOne.currentTile.enemies.length) {
                if (this.heroOne.currentTile.enemies[i].hp > 0) {
                    this.selectedEnemy = this.heroOne.currentTile.enemies[i];
                } else i++;
            }
            if (this.game.click.x > this.firstEnemy.x && this.game.click.x < this.firstEnemy.x + 60 && this.game.click.y > this.firstEnemy.y && this.game.click.y < this.firstEnemy.y + 90 && this.firstEnemy.hp >0) {
                this.selectedEnemy = this.firstEnemy;
            }
            if (this.game.click.x > this.secondEnemy.x && this.game.click.x < this.secondEnemy.x + 60 && this.game.click.y > this.secondEnemy.y && this.game.click.y < this.secondEnemy.y + 90 && this.secondEnemy.hp > 0) {
                this.selectedEnemy = this.secondEnemy;
            }
            //ability 1
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 623 && this.game.click.y < 697 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {

                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                if (this.firstEnemy != null) {
                    if (this.heroOne.currentClass.name === "Berserker") {
                        if (this.heroOne.currentClass.counter && !this.heroOne.currentClass.evade) {
                            this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else if (this.heroOne.currentClass.evade) {
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else {
                            this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        }
                    }
                }
                if (this.secondEnemy != null) {
                    if (this.heroOne.currentClass.name === "Berserker") {
                        if (this.heroOne.currentClass.counter && !this.heroOne.currentClass.evade) {
                            this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else if (this.heroOne.currentClass.evade) {
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else {
                            this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);
                        }
                    }

                }
                if (this.thirdEnemy != null) {
                    if (this.heroOne.currentClass.name === "Berserker") {
                        if (this.heroOne.currentClass.counter && !this.heroOne.currentClass.evade) {
                            this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else if (this.heroOne.currentClass.evade) {
                            this.heroOne.currentClass.abilityOne(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                        } else {
                            this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);
                        }
                    }

                }


                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.selectedEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }
                var snd = new Audio("sound/soundeffect6.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
                

            }
            //ability 2
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 698 && this.game.click.y < 775 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {
                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilityTwo(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                var l = 0;
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);

                }
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.selectedEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect7.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;

            }
            //ability 3 //temp run ability
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 623 && this.game.click.y < 697 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {
                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilityThree(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                var l = 0;
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);

                }
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.selectedEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect12.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 4 //temp heal enemy
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 698 && this.game.click.y < 775 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {
                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilityFour(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                var l = 0;
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability(this.heroOne,this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);

                }
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.selectedEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.selectedEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect9.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 5 //temp black magic poison
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 623 && this.game.click.y < 697 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {
                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilityFive(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                var l = 0;
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);

                }
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.selectedEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect8.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 6
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 698 && this.game.click.y < 775 && this.selectedEnemy != null) {
                if (this.heroOne.currentClass.abilityNineAP === this.heroOne.currentClass.abilityNineAPNeeded) {
                    this.heroOne.currentClass.abilityNine(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.abilityTenAP === this.heroOne.currentClass.abilityTenAPNeeded) {
                    this.heroOne.currentClass.abilityTen(this.heroOne.currentClass);
                }
                if (this.heroOne.currentClass.name === "Black Mage") {
                    if (this.heroOne.currentClass.battleRegen) {
                        this.heroOne.currentClass.mp += this.heroOne.currentClass.mpRegen;
                        if (this.heroOne.currentClass.mp > this.heroOne.currentClass.mpMax) {
                            this.heroOne.currentClass.mp = this.heroOne.currentClass.mpMax;
                        }
                    }
                }
                this.selectedEnemy.aggro = true;
                if (this.heroOne.currentClass.name === "Samurai") {
                    if (this.heroOne.currentClass.innerPeace) this.selectedEnemy.aggro = false;
                }
                this.heroOne.abilitySix(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy);
                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy);

                }
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.selectedEnemy.isPoisoned && this.selectedEnemy.poisonTime > 0) {
                    this.selectedEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.selectedEnemy.poisonTime--;

                } else {
                    this.selectedEnemy.isPoisoned = false;
                    this.selectedEnemy.poisonTime = this.selectedEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect11.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }

            //enemy phase
            if (this.selectedEnemy.hp < 0) {
                this.selectedEnemy.aggro = false;

                this.selectedEnemy = null;
            }
            //this.firstEnemy.abilityOne(this.heroOne, this.firstEnemy);
            //this.secondEnemy.abilityOne(this.heroOne, this.firstEnemy);

            //this.thirdEnemy.abilityOne(this.heroOne, this.firstEnemy);


            //enemy sound effect
            //var snd = new Audio("sound/soundeffect1.mp3");
            //snd.play();
            //snd.currentTime = 0;

            //end battle logic
            if (this.heroOne.currentClass.hp <= 0 && this.firstEnemy.hp >= 0) {
                this.game.battleRunning = false;
                this.game.running = false;
            } else if (this.firstEnemy.hp <= 0 && this.secondEnemy.hp <=0 && this.heroOne.currentClass.hp >= 0) {
                this.game.battleRunning = false;
                this.battleTime = 0;
                this.heroOne.x = this.heroOne.currentX;
                this.heroOne.y = this.heroOne.currentY;
                this.heroOne.currentClass.phystr = this.heroOne.currentClass.phystrMax;
                this.heroOne.currentClass.phydef = this.heroOne.currentClass.phydefMax;
                this.heroOne.currentClass.magdef = this.heroOne.currentClass.magdefMax;
                this.heroOne.currentClass.magstr = this.heroOne.currentClass.magstrMax;

                this.heroOne.currentClass.exp += this.firstEnemy.exp + this.firstEnemy.exp;
                this.heroOne.currentClass.ap += this.firstEnemy.ap + this.firstEnemy.exp;
                this.heroOne.currentClass.hp = this.heroOne.currentClass.hp;
                this.heroOne.currentClass.mp = this.heroOne.currentClass.mp;
                this.selectedEnemy = null;
                this.firstEnemy.reset();
                this.secondEnemy.reset();
            } else if (this.heroOne.currentClass.hp <= 0 && this.firstEnemy.hp <= 0) {
                this.game.battleRunning = false;
                this.game.running = false;
            }
            this.clickX = this.game.click.x;
            this.clickY = this.game.click.y;
        }
    }
    if (!this.game.menuRunning) {
        this.battleTime += this.game.clockTick;
        this.actionTime += this.game.clockTick;

    }


}

Battle.prototype.draw = function (ctx) {


    //console.log(this.heroOne.currentClass);
    if (this.game.battleRunning) {
        ctx.drawImage(ASSET_MANAGER.getAsset(this.heroOne.currentTile.battlemap), this.x, this.y, 760, 760);
        this.firstEnemy.x = 500;
        this.firstEnemy.y = 20;
        ctx.strokeRect(this.firstEnemy.x + 25, this.firstEnemy.y + 20, 60, 90);
        if (this.firstEnemy.hp >= 0) {
            this.firstEnemy.draw(ctx);
        }

        this.secondEnemy.x = 600;
        this.secondEnemy.y = 80;


        ctx.strokeRect(this.secondEnemy.x + 25, this.secondEnemy.y + 20, 60, 90);
        if (this.secondEnemy.hp >= 0) {
            this.secondEnemy.draw(ctx);
        }

        this.heroOne.x = 50;
        this.heroOne.y = 500;
        this.heroOne.draw(ctx);
        var time = 15;
        ctx.font = "24pt Impact";
        var x = this.clickX;
        var y = this.clickY;
        //ability 1
        for (var i = 0; i < this.game.classSystem.length; i++) {
            ctx.strokeRect(20 + (760 / this.game.classSystem.length * i), 560, 760 / this.game.classSystem.length, 65);
            this.game.classSystem[i].draw(ctx, 40 + (760 / this.game.classSystem.length * i), 560, 1.75);
        }
        if (x > 20 && x < 273 && y > 623 && y < 697) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilityOneDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }

            }
        }
        ctx.save();
        ctx.fillStyle = "blue";

        if (this.game.mouse.x > 20 && this.game.mouse.x < 273 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeStyle = "red";

        ctx.moveTo(137, 623);
        ctx.lineTo(137, 698);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityOneDescription, 137, 675);
        ctx.restore();
        ctx.strokeRect(20, 623, 251, 75);
        //TODO fix sound effect 1
        //var snd = new Audio("sounds/soundeffects1.mp3");
        //snd.play();
        //snd.currentTime = 0;

        //ability 2
        if (x > 20 && x < 273 && y > 698 && y < 775) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilityTwoDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }
            }
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 20 && this.game.mouse.x < 273 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(20, 623 + 75, 251, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityTwoDescription, 100, 750);

        //TODO fix sound effect 2

        //ability 3
        if (x > 274 && x < 527 && y > 623 && y < 697) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilityThreeDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }
            }
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(274, 623, 252, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityThreeDescription, 360, 675);

        //TODO fix sound effect 3

        //ability 4
        if (x > 274 && x < 527 && y > 698 && y < 775) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilityFourDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }
            }
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(274, 623 + 75, 252, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityFourDescription, 360, 750);

        //TODO fix sound effect 4

        //ability 5
        if (x > 528 && x < 780 && y > 623 && y < 697) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilityFiveDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }
            }
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 528 && this.game.mouse.x < 780 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(528, 623, 251, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityFiveDescription, 600, 675);

        //TODO fix sound effect 5

        //ability 6
        if (x > 528 && x < 780 && y > 698 && y < 775) {
            if (this.selectedEnemy != null) {
                this.heroOne.abilitySixDisplay(this.heroOne, this.selectedEnemy, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);
                if (this.firstEnemy != null) {
                    this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.secondEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.secondEnemy != null) {
                    this.secondEnemy.ability1Display(this.heroOne, this.secondEnemy, this.firstEnemy, this.thirdEnemy, this.actionTime, ctx);

                }
                if (this.thirdEnemy != null) {
                    this.thirdEnemy.ability1Display(this.heroOne, this.thirdEnemy, this.firstEnemy, this.secondEnemy, this.actionTime, ctx);

                }
            }
        }

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 528 && this.game.mouse.x < 780 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(528, 623 + 75, 251, 75);
        ctx.moveTo(650, 698);
        ctx.lineTo(650, 775);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilitySixDescription, 650, 750);


        ctx.fillStyle = "purple";

        //TODO fix sound effect 6

        //status effects
        if (this.heroOne.isPoisoned) {
            ctx.fillStyle = "Red";
            ctx.fillText("-" + this.selectedEnemy.poisonDamage, hero.x - 10, hero.y + 5);
        }
        if (this.firstEnemy.isPoisoned && this.actionTime < 0.75) {
            ctx.fillStyle = "Green";
            ctx.fillText("-" + this.heroOne.currentClass.poisonDamage, this.firstEnemy.x - 10, this.firstEnemy.y + 24);
        }

        if (this.heroOne.currentClass.hp > 0) {
            if (this.game.mouse) {
                if (this.game.mouse.x > this.heroOne.x && this.game.mouse.x < this.heroOne.x + 50 && this.game.mouse.y > this.heroOne.y && this.game.mouse.y < this.heroOne.y + 50) {
                    ctx.fillText("HP: " + this.heroOne.currentClass.hp + "/" + this.heroOne.currentClass.hpMax, 100, 50);
                    ctx.fillText("MP: " + this.heroOne.currentClass.mp + "/" + this.heroOne.currentClass.mpMax, 90, 100);

                }
            }
        } else {

            ctx.fillText("Game Over Man!", 380, 380);
        }
        ctx.fillStyle = "red";
        if (this.game.mouse) {
            if (this.game.mouse.x > this.firstEnemy.x && this.game.mouse.x < this.firstEnemy.x + 60 && this.game.mouse.y > this.firstEnemy.y && this.game.mouse.y < this.firstEnemy.y + 90) {
                ctx.fillText(this.firstEnemy.hp, 50, 50);

            }
            if (this.game.mouse.x > this.secondEnemy.x && this.game.mouse.x < this.secondEnemy.x + 60 && this.game.mouse.y > this.secondEnemy.y && this.game.mouse.y < this.secondEnemy.y + 90) {
                ctx.fillText(this.secondEnemy.hp, 50, 50);

            }
        }

    }
}
function Ghoul(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 45;
    this.mp = 0;
    this.aggro = false;
    this.phystr = 7;
    this.phydef = 5;
    this.magstr = 1;
    this.magdef = 0;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Dark");
    this.exp = 2;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/ghoul.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/ghoul.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/ghoul.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/ghoul.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/ghoul.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Ghoul.prototype = new Entity();
Ghoul.prototype.constructor = Ghoul;

Ghoul.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Ghoul.prototype.reset = function () {
    this.hp = 45;
    this.mp = 0;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Ghoul.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            } 
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Ghoul.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Shield crack", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Ghoul.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/ghoul.png"),
      //            this.x, this.y, 80, 80);
}

function Emu(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 55;
    this.mp = 40;
    this.phystr = 3;
    this.phydef = 12;
    this.magstr = 7;
    this.magdef = 3;
    this.weakness = [];
    this.weakness.push("Fire");
    this.strength = [];
    this.exp = 2;
    this.ap = 1;
    this.aggro = false;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/emu.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/emu.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/emu.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/emu.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/emu.png"), 64, 64, .2, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;

    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Emu.prototype = new Entity();
Emu.prototype.constructor = Emu;

Emu.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Emu.prototype.reset = function () {
    this.hp = 55;
    this.mp = 0;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Emu.prototype.ability = function (hero, enemy, ally1, ally2) {

    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.magGuard) {
                if ((enemy.magstr - hero.currentClass.magdef) > 0) {
                    hero.currentClass.pastDamage = (enemy.magstr - hero.currentClass.magdef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.magstr - hero.currentClass.magdef);
                }
            }
        } else {
            if ((enemy.magstr - hero.currentClass.magdef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.magstr - hero.currentClass.magdef);
            }
        }
    } else {
        if(ally1.phystr < ally1.phydef) {
            ally1.phystr += 3;
        } else  if(ally1.phystr > ally1.phydef) {
            ally1.phydef += 1;
        }
        if (ally2.phystr < ally2.phydef) {
            ally2.phystr += 3;
        } else if (ally2.phystr > ally2.phydef) {
            ally2.phydef += 1;
        }
    }

}
Emu.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red"
        if (this.aggro) {
            if ((enemy.magstr - hero.currentClass.magdef) > 0) {
                ctx.fillText("-" + (enemy.magstr - hero.currentClass.magdef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            if (ally1.phystr < ally1.phydef) {
                ctx.fillText("Attack Up", ally1.x - 10, ally1.y + 5);
            } else if (ally1.phystr > ally1.phydef) {
                ctx.fillText("Defense Up", ally1.x - 10, ally1.y + 5);

            }
            if (ally2.phystr < ally2.phydef) {
                ctx.fillText("Attack Up", ally2.x - 10, ally2.y + 5);
            } else if (ally1.phystr > ally1.phydef) {
                ctx.fillText("Defense Up", ally2.x - 10, ally2.y + 5);
            }
        }
        
        ctx.restore();
    }
}
Emu.prototype.draw = function (ctx) {
    //ctx.strokeRect(this.x + 25, this.y + 20, 60, 90);

    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/emu.png"),
    //            this.x, this.y, 80, 80);
}

function Wolfkin(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 55;
    this.mp = 0;
    this.phystr = 11;
    this.phydef = 6;
    this.magstr = 1;
    this.magdef = 3;
    this.exp = 2;
    this.ap = 10;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Dark");
    this.aggro = false;
    this.isPoisoned = false;
    this.poisonTime = 5;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/wolfkin.png"), 64, 64, .4, 3, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/wolfkin.png"), 64, 64, .4, 3, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/wolfkin.png"), 64, 64, .4, 3, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/wolfkin.png"), 64, 64, .4, 3, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/wolfkin.png"), 64, 64, .2, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 650;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Wolfkin.prototype = new Entity();
Wolfkin.prototype.constructor = Wolfkin;

Wolfkin.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Wolfkin.prototype.reset = function () {
    this.hp = 55;
    this.mp = 0;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Wolfkin.prototype.ability = function (hero, enemy) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }
    } else {

    }

}
Wolfkin.prototype.ability1Display = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red"
        if (this.aggro) {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        }

        ctx.restore();
    }
}
Wolfkin.prototype.draw = function (ctx) {
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);

    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Wolfkin.png"),
    //            this.x, this.y, 80, 80);
}
function Dinox(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 60;
    this.mp = 5;
    this.aggro = false;
    this.phystr = 12;
    this.phydef = 7;
    this.magstr = 2;
    this.magdef = 1;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Shadow");
    this.exp = 2;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/dinox.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/dinox.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/dinox.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/dinox.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/dinox.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Dinox.prototype = new Entity();
Dinox.prototype.constructor = Dinox;

Dinox.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Dinox.prototype.reset = function () {
    this.hp = 60;
    this.mp = 5;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Dinox.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Dinox.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Claw Slash", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Dinox.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/dinox.png"),
    //            this.x, this.y, 80, 80);
}
function LizardMan(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 65;
    this.mp = 5;
    this.aggro = false;
    this.phystr = 14;
    this.phydef = 10;
    this.magstr = 2;
    this.magdef = 2;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Shadow");
    this.exp = 2;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/lizardman.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/lizardman.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/lizardman.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/lizardman.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/lizardman.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
LizardMan.prototype = new Entity();
LizardMan.prototype.constructor = LizardMan;

LizardMan.prototype.update = function () {

    Entity.prototype.update.call(this);
}
LizardMan.prototype.reset = function () {
    this.hp = 65;
    this.mp = 5;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
LizardMan.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
LizardMan.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Cleaver Hack", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
LizardMan.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/LizardMan.png"),
    //            this.x, this.y, 80, 80);
}
function TornadoLizard(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 65;
    this.mp = 15;
    this.aggro = false;
    this.phystr = 4;
    this.phydef = 4;
    this.magstr = 15;
    this.magdef = 12;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Shadow");
    this.exp = 5;
    this.ap = 8;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/tornadolizard.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/tornadolizard.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/tornadolizard.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/tornadolizard.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/tornadolizard.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "BMage";

    Entity.call(this, game, this.x, this.y);

}
TornadoLizard.prototype = new Entity();
TornadoLizard.prototype.constructor = TornadoLizard;

TornadoLizard.prototype.update = function () {

    Entity.prototype.update.call(this);
}
TornadoLizard.prototype.reset = function () {
    this.hp = 65;
    this.mp = 15;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
TornadoLizard.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
TornadoLizard.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Mini Storm", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
TornadoLizard.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/TornadoLizard.png"),
    //            this.x, this.y, 80, 80);
}
function Seabird(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 30;
    this.mp = 5;
    this.aggro = false;
    this.phystr = 10;
    this.phydef = 4;
    this.magstr = 0;
    this.magdef = 5;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Gravity");
    this.strength = [];
    this.strength.push("Water");
    this.exp = 3;
    this.ap = 2;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/seabird.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/seabird.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/seabird.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/seabird.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/seabird.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Seabird.prototype = new Entity();
Seabird.prototype.constructor = Seabird;

Seabird.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Seabird.prototype.reset = function () {
    this.hp = 30;
    this.mp = 5;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Seabird.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Seabird.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Gull Slash", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Seabird.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Seabird.png"),
    //            this.x, this.y, 80, 80);
}
function Gillman(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 70;
    this.mp = 5;
    this.aggro = false;
    this.phystr = 18;
    this.phydef = 12;
    this.magstr = 0;
    this.magdef = 5;
    this.weakness = [];
    this.weakness.push("Fire");
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Water");
    this.exp = 7;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/gillman.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/gillman.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/gillman.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/gillman.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/gillman.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Gillman.prototype = new Entity();
Gillman.prototype.constructor = Gillman;

Gillman.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Gillman.prototype.reset = function () {
    this.hp = 70;
    this.mp = 5;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Gillman.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Gillman.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Trident Stab", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Gillman.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Gillman.png"),
    //            this.x, this.y, 80, 80);
}
function Sentinel(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 75;
    this.mp = 10;
    this.aggro = false;
    this.phystr = 18;
    this.phydef = 12;
    this.magstr = 0;
    this.magdef = 5;
    this.weakness = [];
    this.weakness.push("Light");
    this.strength = [];
    this.strength.push("Water");
    this.exp = 8;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/sentinel.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/sentinel.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/sentinel.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/sentinel.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/sentinel.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Sentinel.prototype = new Entity();
Sentinel.prototype.constructor = Sentinel;

Sentinel.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Sentinel.prototype.reset = function () {
    this.hp = 75;
    this.mp = 10;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Sentinel.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Sentinel.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Sword Hack", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Sentinel.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Sentinel.png"),
    //            this.x, this.y, 80, 80);
}
function Siren(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 85;
    this.mp = 15;
    this.aggro = false;
    this.phystr = 8;
    this.phydef = 10;
    this.magstr = 18;
    this.magdef = 20;
    this.weakness = [];
    this.weakness.push("Light");
    this.weakness.push("Fire");
    this.strength = [];
    this.strength.push("Water");
    this.strength.push("Dark");
    this.exp = 10;
    this.ap = 7;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/siren.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/siren.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/siren.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/siren.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/siren.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "BMage";

    Entity.call(this, game, this.x, this.y);

}
Siren.prototype = new Entity();
Siren.prototype.constructor = Siren;

Siren.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Siren.prototype.reset = function () {
    this.hp = 85;
    this.mp = 15;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Siren.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Siren.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Seductive Tune", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Siren.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Siren.png"),
    //            this.x, this.y, 80, 80);
}
function Hydra(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 85;
    this.mp = 12;
    this.aggro = false;
    this.phystr = 22;
    this.phydef = 15;
    this.magstr = 2;
    this.magdef = 7;
    this.weakness = [];
    this.weakness.push("Light");
    this.weakness.push("Flame");
    this.strength = [];
    this.strength.push("Water");
    this.exp = 8;
    this.ap = 5;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/hydra.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/hydra.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/hydra.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/hydra.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/hydra.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
Hydra.prototype = new Entity();
Hydra.prototype.constructor = Hydra;

Hydra.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Hydra.prototype.reset = function () {
    this.hp = 85;
    this.mp = 12;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Hydra.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Hydra.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Recursive Strike", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Hydra.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Hydra.png"),
    //            this.x, this.y, 80, 80);
}
function BlueDragon(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 95;
    this.mp = 20;
    this.aggro = false;
    this.phystr = 22;
    this.phydef = 20;
    this.magstr = 0;
    this.magdef = 10;
    this.weakness = [];
    this.weakness.push("Light");
    this.weakness.push("Fire");
    this.strength = [];
    this.strength.push("Water");
    this.strength.push("Dark");
    this.exp = 10;
    this.ap = 7;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/bluedragon.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/bluedragon.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/bluedragon.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/bluedragon.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/bluedragon.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Warrior";

    Entity.call(this, game, this.x, this.y);

}
BlueDragon.prototype = new Entity();
BlueDragon.prototype.constructor = BlueDragon;

BlueDragon.prototype.update = function () {

    Entity.prototype.update.call(this);
}
BlueDragon.prototype.reset = function () {
    this.hp = 95;
    this.mp = 20;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
BlueDragon.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
BlueDragon.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Tail Thrash", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
BlueDragon.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/BlueDragon.png"),
    //            this.x, this.y, 80, 80);
}
function FlameDragon(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 100;
    this.mp = 22;
    this.aggro = false;
    this.phystr = 12;
    this.phydef = 18;
    this.magstr = 20;
    this.magdef = 15;
    this.weakness = [];
	this.weakness.push("Water");
    this.strength = [];
    this.strength.push("Fire");
    this.exp = 15;
    this.ap = 9;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/flamedragon.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/flamedragon.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/flamedragon.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/flamedragon.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/flamedragon.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "BMage";

    Entity.call(this, game, this.x, this.y);

}
FlameDragon.prototype = new Entity();
FlameDragon.prototype.constructor = FlameDragon;

FlameDragon.prototype.update = function () {

    Entity.prototype.update.call(this);
}
FlameDragon.prototype.reset = function () {
    this.hp = 100;
    this.mp = 22;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
FlameDragon.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            } 
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
FlameDragon.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Fireball", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
FlameDragon.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/FlameDragon.png"),
      //            this.x, this.y, 80, 80);
}
function SeaDragon(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 100;
    this.mp = 22;
    this.aggro = false;
    this.phystr = 22;
    this.phydef = 20;
    this.magstr = 10;
    this.magdef = 5;
    this.weakness = [];
    this.weakness.push("Fire");
    this.strength = [];
    this.strength.push("Water");
    this.exp = 17;
    this.ap = 11;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/seadragon.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/seadragon.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/seadragon.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/seadragon.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/seadragon.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "DKnight";

    Entity.call(this, game, this.x, this.y);

}
SeaDragon.prototype = new Entity();
SeaDragon.prototype.constructor = SeaDragon;

SeaDragon.prototype.update = function () {

    Entity.prototype.update.call(this);
}
SeaDragon.prototype.reset = function () {
    this.hp = 100;
    this.mp = 22;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
SeaDragon.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
SeaDragon.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Vortex", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
SeaDragon.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/SeaDragon.png"),
    //            this.x, this.y, 80, 80);
}
function Chimera(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 120;
    this.mp = 24;
    this.aggro = false;
    this.phystr = 22;
    this.phydef = 14;
    this.magstr = 16;
    this.magdef = 10;
    this.weakness = [];
    this.weakness.push("Gravity");
    this.strength = [];
    this.strength.push("Water");
    this.strength.push("Fire");
    this.exp = 20;
    this.ap = 14;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/chimera.png"), 64, 64, .4, 2, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/chimera.png"), 64, 64, .4, 2, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/chimera.png"), 64, 64, .4, 2, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/chimera.png"), 64, 64, .4, 2, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/chimera.png"), 64, 64, .1, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 700;
    this.y = 50;
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    this.widthClick = 60;
    this.heightClick = 90;
    this.currentClass = "Berserker";

    Entity.call(this, game, this.x, this.y);

}
Chimera.prototype = new Entity();
Chimera.prototype.constructor = Chimera;

Chimera.prototype.update = function () {

    Entity.prototype.update.call(this);
}
Chimera.prototype.reset = function () {
    this.hp = 120;
    this.mp = 24;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;
    this.aggro = false;

    Entity.prototype.update.call(this);
}
Chimera.prototype.ability = function (hero, enemy, ally1, ally2) {
    if (this.aggro) {
        if (hero.currentClass.name === "Psychic") {

            if (!hero.currentClass.physGuard) {
                if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                    hero.currentClass.pastDamage = (enemy.phystr - hero.currentClass.phydef);
                    hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
                }
            }
        } else {
            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
            }
        }

    } else {
        if ((enemy.phystr - hero.currentClass.phydef) > 0) hero.currentClass.phydef--;
    }

}
Chimera.prototype.ability1Display = function (hero, enemy, ally1, ally2, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red";
        if (this.aggro) {

            if ((enemy.phystr - hero.currentClass.phydef) > 0) {
                ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

            } else {
                ctx.fillText(0, hero.x - 10, hero.y + 5);

            }
        } else {
            ctx.fillText("Amalgo-flame", hero.x - 10, hero.y + 5);
        }
        ctx.restore();
    }
}
Chimera.prototype.draw = function (ctx) {
    this.xClick = this.x + 25;
    this.yClick = this.y + 20;
    //ctx.strokeRect(this.xClick, this.yClick, this.widthClick, this.heightClick);
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    //ctx.drawImage(ASSET_MANAGER.getAsset("./img/Chimera.png"),
    //            this.x, this.y, 80, 80);
}
function Hero(game, cen, col, job, tile) {
    this.cen = cen;
    this.col = col;
    this.isPoisoned = false;
    this.abilityOneDescription = job.abilityOneDescription;
    this.abilityTwoDescription = job.abilityTwoDescription;
    this.abilityThreeDescription = "";
    this.abilityFourDescription = "";
    this.abilityFiveDescription = "";
    this.abilitySixDescription = "";
    this.abilityOne = job.abilityOne;
    this.abilityTwo = job.abilityTwo;
    this.abilityThree = null;
    this.abilityFour = null;
    this.abilityFive = null;
    this.abilitySix = null;
    this.abilityOneDisplay = job.abilityOneDisplay;
    this.abilityTwoDisplay = job.abilityTwoDisplay;
    this.abilityThreeDisplay = null;
    this.abilityFourDisplay = null;
    this.abilityFiveDisplay = null;
    this.abilitySixDisplay = null;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 2, this.cen, this.col);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 1, this.cen, this.col);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 3, this.cen, this.col);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 380;
    this.y = 380;
    this.currentX = 380;
    this.currentY = 380;
    this.currentClass = job;
    this.currentTile = tile;
    this.collidedWithLeftSide = false;
    this.collidedWithRightSide = false;
    this.collidedWithBottom = false;
    this.collidedWithTop = false;
    this.boundingbox = new BoundingBox(this.x, this.y, this.animation.frameWidth + 20, this.animation.frameHeight + 25);
    this.circle1 = new Circle(this.x, this.y, 50);

    Entity.call(this, game, 380, 380);
    this.abilityTime = 0;


}

Hero.prototype = new Entity();
Hero.prototype.constructor = Hero;

Hero.prototype.update = function () {
    if (!this.game.menuRunning && !this.game.battleRunning) {
        this.circle1 = new Circle(this.x+26, this.y+27, 27);

        this.boundingbox.x = this.x;
        this.boundingbox.y = this.y;
        this.boundingbox.width = this.animation.frameWidth + 20;
        this.boundingbox.height = this.animation.frameHeight + 25;
        this.boundingbox.left = this.boundingbox.x;
        this.boundingbox.top = this.boundingbox.y;
        this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
        this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;

        if (this.game.up) {
            if (this.currentClass.hp < this.currentClass.hpMax) {
                this.currentClass.hp += this.currentClass.hpRegen;
            } else if (this.currentClass.hp > this.currentClass.hpMax) {
                this.currentClass.hp = this.currentClass.hpMax;
            }
            if (this.currentClass.mp < this.currentClass.mpMax) {
                this.currentClass.mp += this.currentClass.mpRegen;
            } else if (this.currentClass.mp > this.currentClass.mpMax) {
                this.currentClass.mp = this.currentClass.mpMax;
            }
            this.movingNorth = true;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = false;
            if (this.currentTile.boundingbox1 != null) {
                if (this.boundingbox.collideBottomObject(this.currentTile.boundingbox1, "up")) {
                    this.movingNorth = false;
                }
            }
            if (this.currentTile.boundingbox2 != null) {
                if (this.boundingbox.collideBottomObject(this.currentTile.boundingbox2, "up")) {
                    this.movingNorth = false;
                }
            }

            if (this.currentTile.boundingbox3 != null) {
                if (this.boundingbox.collideBottomObject(this.currentTile.boundingbox3, "up")) {
                    this.movingNorth = false;
                }
            }
            if (this.currentTile.boundingbox4 != null) {
                if (this.boundingbox.collideBottomObject(this.currentTile.boundingbox4, "up")) {
                    this.movingNorth = false;
                }
            }
            if (!this.boundingbox.collideTop(this.currentTile.boundingbox)) {
                this.movingNorth = false;
                if (this.currentTile.NorthTile != null) {
                    this.currentTile = this.currentTile.NorthTile;
                    this.currentY = 760;
                    this.y = 760;
                }
            } else if (this.movingNorth) {
                this.currentY = this.currentY - 32.2;
                this.y = this.y - 32.2;
            }
        } else if (this.game.left) {

            if (this.currentClass.hp < this.currentClass.hpMax) {
                this.currentClass.hp += this.currentClass.hpRegen;
            } else if (this.currentClass.hp > this.currentClass.hpMax) {
                this.currentClass.hp = this.currentClass.hpMax;
            }
            if (this.currentClass.mp < this.currentClass.mpMax) {
                this.currentClass.mp += this.currentClass.mpRegen;
            } else if (this.currentClass.mp > this.currentClass.mpMax) {
                this.currentClass.mp = this.currentClass.mpMax;
            }
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = true;
            this.movingEast = false;
            if (this.currentTile.boundingbox1 != null) {
                if (this.boundingbox.collideRightObject(this.currentTile.boundingbox1, "left")) {
                    this.movingWest = false;

                }
            }
            if (this.currentTile.boundingbox2 != null) {
                if (this.boundingbox.collideRightObject(this.currentTile.boundingbox2, "left")) {
                    this.movingWest = false;

                }
            }
            if (this.currentTile.boundingbox3 != null) {
                if (this.boundingbox.collideRightObject(this.currentTile.boundingbox3, "left")) {
                    this.movingWest = false;

                }
            }
            if (this.currentTile.boundingbox4 != null) {
                if (this.boundingbox.collideRightObject(this.currentTile.boundingbox4, "left")) {
                    this.movingWest = false;

                }
            }
            if (!this.boundingbox.collideLeft(this.game.platforms[0].boundingbox)) {
                this.movingWest = false;
                if (this.currentTile.WestTile != null) {
                    this.currentTile = this.currentTile.WestTile;
                    this.currentX = 760;
                    this.x = 760;
                }
            } else if (this.movingWest) {
                this.currentX = this.currentX - 32.2;
                this.x = this.x - 32.2;
            }

        } else if (this.game.down) {
            if (this.currentClass.hp < this.currentClass.hpMax) {
                this.currentClass.hp += this.currentClass.hpRegen;
            } else if (this.currentClass.hp > this.currentClass.hpMax) {
                this.currentClass.hp = this.currentClass.hpMax;
            }
            if (this.currentClass.mp < this.currentClass.mpMax) {
                this.currentClass.mp += this.currentClass.mpRegen;
            } else if (this.currentClass.mp > this.currentClass.mpMax) {
                this.currentClass.mp = this.currentClass.mpMax;
            }
            this.movingNorth = false;
            this.movingSouth = true;
            this.movingWest = false;
            this.movingEast = false;
            if (this.currentTile.boundingbox1 != null) {
                if (this.boundingbox.collideTopObject(this.currentTile.boundingbox1, "down")) {
                    this.movingSouth = false;
                }
            }
            if (this.currentTile.boundingbox2 != null) {
                if (this.boundingbox.collideTopObject(this.currentTile.boundingbox2, "down")) {
                    this.movingSouth = false;
                }
            }
            if (this.currentTile.boundingbox3 != null) {
                if (this.boundingbox.collideTopObject(this.currentTile.boundingbox3, "down")) {
                    this.movingSouth = false;
                }
            }
            if (this.currentTile.boundingbox4 != null) {
                if (this.boundingbox.collideTopObject(this.currentTile.boundingbox4, "down")) {
                    this.movingSouth = false;
                }
            }
            if (!this.boundingbox.collideBottom(this.game.platforms[0].boundingbox)) {
                this.movingSouth = false;
                if (this.currentTile.SouthTile != null) {
                    this.currentTile = this.currentTile.SouthTile;
                    this.currentY = 0;
                    this.y = 0;
                }
            } else if (this.movingSouth) {
                this.currentY = this.currentY + 32.2;
                this.y = this.y + 32.2;
            }

        } else if (this.game.right) {
            if (this.currentClass.hp < this.currentClass.hpMax) {
                this.currentClass.hp += this.currentClass.hpRegen;
            } else if (this.currentClass.hp > this.currentClass.hpMax) {
                this.currentClass.hp = this.currentClass.hpMax;
            }
            if (this.currentClass.mp < this.currentClass.mpMax) {
                this.currentClass.mp += this.currentClass.mpRegen;
            } else if (this.currentClass.mp > this.currentClass.mpMax) {
                this.currentClass.mp = this.currentClass.mpMax;
            }
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = true;
            if (this.currentTile.boundingbox1 != null) {
                if (this.boundingbox.collideLeftObject(this.currentTile.boundingbox1, "right")) {
                    this.movingEast = false;

                }
            }
            if (this.currentTile.boundingbox2 != null) {
                if (this.boundingbox.collideLeftObject(this.currentTile.boundingbox2, "right")) {
                    this.movingEast = false;

                }
            }
            if (this.currentTile.boundingbox3 != null) {
                if (this.boundingbox.collideLeftObject(this.currentTile.boundingbox3, "right")) {
                    this.movingEast = false;

                }
            }
            if (this.currentTile.boundingbox4 != null) {
                if (this.boundingbox.collideLeftObject(this.currentTile.boundingbox4, "right")) {
                    this.movingEast = false;

                }
            }
            if (!this.boundingbox.collideRight(this.game.platforms[0].boundingbox)) {
                this.movingEast = false;

                if (this.currentTile.EastTile != null) {
                    this.currentTile = this.currentTile.EastTile;
                    this.currentX = 20;
                    this.x = 20;
                }
            } else if (this.movingEast) {
                this.currentX = this.currentX + 32.2;
                this.x = this.x + 32.2;
            }

        }
    }

    Entity.prototype.update.call(this);
}
Hero.prototype.changeClass = function (val) {
    this.currentClass = this.game.classSystem[val];
    this.abilityOneDescription = this.currentClass.abilityOneDescription;
    this.abilityTwoDescription = this.currentClass.abilityTwoDescription;
    this.abilityThreeDescription = "";
    this.abilityFourDescription = "";
    this.abilityFiveDescription = "";
    this.abilitySixDescription = "";
    this.abilityOne = this.currentClass.abilityOne;
    this.abilityTwo = this.currentClass.abilityTwo;
    this.abilityThree = null;
    this.abilityFour = null;
    this.abilityFive = null;
    this.abilitySix = null;
    this.abilityOneDisplay = this.currentClass.abilityOneDisplay;
    this.abilityTwoDisplay = this.currentClass.abilityTwoDisplay;
    this.abilityThreeDisplay = null;
    this.abilityFourDisplay = null;
    this.abilityFiveDisplay = null;
    this.abilitySixDisplay = null;
    this.cen = this.currentClass.cen;
    this.col = this.currentClass.col;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 2, this.cen, this.col);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 1, this.cen, this.col);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 3, this.cen, this.col);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
}
Hero.prototype.draw = function (ctx) {
    if (this.game.menuRunning) {
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        return;
    }
    if (this.game.battleRunning) {
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        return;
    }
    this.currentTile.draw(ctx);
    if (this.movingSouth && this.game.down) {
        this.game.down = false;
        if (this.boxes) {
            //ctx.strokeStyle = "blue";
            //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Danimation;
    } else if (this.movingNorth && this.game.up) {
        this.game.up = false;
        if (this.boxes) {
            //ctx.strokeStyle = "blue";
            //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Uanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Uanimation;
    } else if (this.movingWest && this.game.left) {
        this.game.left = false;
        if (this.boxes) {
            //ctx.strokeStyle = "blue";
            //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Lanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Lanimation;
    } else if (this.movingEast && this.game.right) {
        this.game.left = false;
        if (this.boxes) {
            //ctx.strokeStyle = "blue";
            //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Ranimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Ranimation;

    } else {
        if (this.boxes) {
            //ctx.strokeStyle = "blue";
            //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    }
    ctx.beginPath();
    //ctx.arc(this.circle1.x, this.circle1.y, this.circle1.radius, 0 * Math.PI, 2 * Math.PI);
    ctx.stroke();
}
function Gunner(game) {
    this.level = 1;
    this.cen = 8;
    this.col = 0;
    this.hp = 100;
    this.hpMax = 100;
    this.hpRegen = 3;
    this.mp = 26;
    this.mpMax = 26;
    this.mpRegen = 2;
    this.phystr = 10;
    this.phystrMax = 10;
    this.phydef = 10;
    this.phydefMax = 10;
    this.magstr = 2;
    this.magstrMax = 2;
    this.magdef = 3;
    this.magdefMax = 3;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.name = "Gunner";
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Heal Bullet";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Cheap Shot";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 10;

    this.abilityFourDescription = "Burst Shot";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 15;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 18;

    this.abilitySixDescription = "Scattershot";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 45;

    this.random1 = 0;
    this.random2 = 0;
    this.random3 = 0;
    this.abilitySevenDescription = "Anarchy";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Potshot";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 30;

    this.abilityNineDescription = "Plasma Bullet";
    this.plasma = false;
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 50;

    this.abilityTenDescription = "Overload";
    this.overload = false;
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 500;
    Entity.call(this, game, 380, 380);
}
Gunner.prototype = new Entity();
Gunner.prototype.constructor = Gunner;
Gunner.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.mp = this.mpMax;
        this.mpMax += 2;
        this.phystr += 2;
        this.phydef += 3;
        this.magstr += 2;
        this.magdef += 2;
        this.phystrMax += 2;
        this.phydefMax += 3;
        this.magstrMax += 2;
        this.magdefMax += 2;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Gunner.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if ((plasma - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma - selectedEnemy.phydef);
            }
        } else {
            if ((plasma - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma - selectedEnemy.phydef);
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((overload - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (overload - selectedEnemy.phydef);
            }
        } else {
            if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr - selectedEnemy.phydef);
            }
        }
    }
}
Gunner.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((plasma - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
    }
}
Gunner.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;

        }
        hero.currentClass.mp -= cost;
    }
}
Gunner.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp >= cost) {
            ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Gunner.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            selectedEnemy.hp = selectedEnemy.hp - plasma;
        } else {
            selectedEnemy.hp = selectedEnemy.hp - plasma;
        }
    } else {
        if (hero.currentClass.overload) {
            selectedEnemy.hp = selectedEnemy.hp - overload;
        } else {
            selectedEnemy.hp = selectedEnemy.hp - hero.currentClass.phystr;
        }
    }
}
Gunner.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + plasma , selectedEnemy.x - 10, selectedEnemy.y - 5);
                } 
            } else {
                if ((plasma*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + plasma, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + overload, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + hero.currentClass.phystr, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            }
        }
    }
}
Gunner.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if ((plasma*5 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma*5 - selectedEnemy.phydef);
            }
        } else {
            if ((plasma*5 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma*5 - selectedEnemy.phydef);
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((overload*5 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (overload*5 - selectedEnemy.phydef);
            }
        } else {
            if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr*5 - selectedEnemy.phydef);
            }
        }
    }
}
Gunner.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma*5 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((plasma*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma*5 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload*5 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr*5 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr*5 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
    }
}
Gunner.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if (selectedEnemy.phydef > 100) {
                plasma *= 10;
                selectedEnemy.hp = selectedEnemy.hp - plasma;
            } else {
                selectedEnemy.hp = selectedEnemy.hp - plasma;
            }
        } else {
            if (selectedEnemy.phydef > 100) {
                plasma *= 10;
                selectedEnemy.hp = selectedEnemy.hp - plasma;
            } else {
                selectedEnemy.hp = selectedEnemy.hp - plasma;
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((selectedEnemy.phydef) > 100) {
                overload *= 10;
                selectedEnemy.hp = selectedEnemy.hp - overload;
            } else {
                selectedEnemy.hp = selectedEnemy.hp - overload;
            }
        } else {
            if ((selectedEnemy.phydef) > 100) {
                selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr * 10);

            } else {
                selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr);

            }
        }
    }
}
Gunner.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if (selectedEnemy.phydef > 100) {
                    plasma *= 10;
                    ctx.fillText("-" + plasma, selectedEnemy.x - 10, selectedEnemy.y - 5);               
                } else {
                    ctx.fillText("-" + plasma, selectedEnemy.x - 10, selectedEnemy.y - 5);               
                }
            } else {
                if (selectedEnemy.phydef > 100) {
                    plasma *= 10;
                    ctx.fillText("-" + plasma, selectedEnemy.x - 10, selectedEnemy.y - 5);               
                } else {
                    ctx.fillText("-" + plasma, selectedEnemy.x - 10, selectedEnemy.y - 5);               
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((selectedEnemy.phydef) > 100) {
                    overload *= 10;
                    ctx.fillText("-" + overload, selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + overload, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((selectedEnemy.phydef) > 100) {
                    ctx.fillText("-" + hero.currentClass.phystr*10, selectedEnemy.x - 10, selectedEnemy.y - 5);

                } else {
                    ctx.fillText("-" + hero.currentClass.phystr, selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
    }
}
Gunner.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if ((plasma - selectedEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (plasma - firstEnemy.phydef);
            }
            if ((plasma - selectedEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (plasma - secondEnemy.phydef);
            }
            if ((plasma - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (plasma - thirdEnemy.phydef);
            }
        } else {
            if ((plasma - selectedEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (plasma - firstEnemy.phydef);
            }
            if ((plasma - selectedEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (plasma - secondEnemy.phydef);
            }
            if ((plasma - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (plasma - thirdEnemy.phydef);
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((overload - firstEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (overload - firstEnemy.phydef);
            }
            if ((overload - secondEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (overload - secondEnemy.phydef);
            }
            if ((overload - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (overload - thirdEnemy.phydef);
            }
        } else {
            if ((hero.currentClass.phystr - firstEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (hero.currentClass.phystr - firstEnemy.phydef);
            }
            if ((hero.currentClass.phystr - secondEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (hero.currentClass.phystr - secondEnemy.phydef);
            }
            if ((hero.currentClass.phystr - thirdEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (hero.currentClass.phystr - thirdEnemy.phydef);
            }
        }
    }
}
Gunner.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);
                }
                if ((plasma - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((plasma - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            } else {
                if ((plasma - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);
                }
                if ((plasma - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((plasma - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
                if ((overload - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((overload - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);

                }
                if ((hero.currentClass.phystr - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);

                }
                if ((hero.currentClass.phystr - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);

                }
            }
        }
    }
}
Gunner.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    this.random1 = Math.random() * (100 - 1) + 1;
    this.random2 = Math.random() * (100 - 1) + 1;
    this.random3 = Math.random() * (100 - 1) + 1;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if ((plasma * this.random1 - selectedEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (plasma * this.random1 - firstEnemy.phydef);
            }
            if ((plasma * this.random2 - selectedEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (plasma * this.random2 - secondEnemy.phydef);
            }
            if ((plasma * this.random3 - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (plasma * this.random3 - thirdEnemy.phydef);
            }
        } else {
            if ((plasma * this.random1 - selectedEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (plasma * this.random1 - firstEnemy.phydef);
            }
            if ((plasma * this.random2 - selectedEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (plasma * this.random2 - secondEnemy.phydef);
            }
            if ((plasma * this.random3 - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (plasma * this.random3 - thirdEnemy.phydef);
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((overload * this.random1 - firstEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (overload * this.random1 - firstEnemy.phydef);
            }
            if ((overload * this.random1 - secondEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (overload * this.random2 - secondEnemy.phydef);
            }
            if ((overload * this.random1 - selectedEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (overload * this.random3 - thirdEnemy.phydef);
            }
        } else {
            if ((hero.currentClass.phystr * this.random1 - firstEnemy.phydef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (hero.currentClass.phystr * this.random1 - firstEnemy.phydef);
            }
            if ((hero.currentClass.phystr * this.random2 - secondEnemy.phydef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (hero.currentClass.phystr * this.random2 - secondEnemy.phydef);
            }
            if ((hero.currentClass.phystr * this.random3 - thirdEnemy.phydef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (hero.currentClass.phystr * this.random3 - thirdEnemy.phydef);
            }
        }
    }
}
Gunner.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma * this.random1 - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random1 - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);
                }
                if ((plasma * this.random2 - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random2 - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((plasma * this.random2 - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random3 - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            } else {
                if ((plasma * this.random1 - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random1 - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);
                }
                if ((plasma * this.random2 - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random2 - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((plasma * this.random2 - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma * this.random3 - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload * this.random1 - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload * this.random1 - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
                if ((overload * this.random2 - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload * this.random2 - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);
                }
                if ((overload * this.random3 - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload * this.random3 - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr * this.random1 - firstEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr * this.random1 - firstEnemy.phydef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, firstEnemy.x - 10, firstEnemy.y - 5);

                }
                if ((hero.currentClass.phystr * this.random2 - secondEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr * this.random3 - secondEnemy.phydef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, secondEnemy.x - 10, secondEnemy.y - 5);

                }
                if ((hero.currentClass.phystr * this.random3 - thirdEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr * this.random3 - thirdEnemy.phydef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, thirdEnemy.x - 10, thirdEnemy.y - 5);

                }
            }
        }
    }

}
Gunner.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var plasma = hero.currentClass.phystr * 3;
    var overload = hero.currentClass.phystr * 10;
    if (hero.currentClass.plasma) {
        if (hero.currentClass.overload) {
            plasma *= 10;
            if ((plasma*15 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma*15 - selectedEnemy.phydef);
            }
        } else {
            if ((plasma*15 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (plasma*15 - selectedEnemy.phydef);
            }
        }
    } else {
        if (hero.currentClass.overload) {
            if ((overload*15 - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (overload*15 - selectedEnemy.phydef);
            }
        } else {
            if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr*15 - selectedEnemy.phydef);
            }
        }
    }
}
Gunner.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        var plasma = hero.currentClass.phystr * 3;
        var overload = hero.currentClass.phystr * 10;
        if (hero.currentClass.plasma) {
            if (hero.currentClass.overload) {
                plasma *= 10;
                if ((plasma*15 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma*15 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((plasma*15 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (plasma*15 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            }
        } else {
            if (hero.currentClass.overload) {
                if ((overload*15 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (overload*15 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);
                }
            } else {
                if ((hero.currentClass.phystr*15 - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr*15 - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("-" + 0, selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
    }
}
Gunner.prototype.abilityNine = function (hero) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.plasma = true;

}
Gunner.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Gunner.prototype.abilityTen = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.overload = true;
}
Gunner.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Gunner.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}

function BMage(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 4;
    this.hp = 90;
    this.hpMax = 90;
    this.hpRegen = 4;
    this.mp = 100;
    this.mpMax = 100;
    this.mpRegen = 8;
    this.phystr = 3;
    this.phystrMax = 3;
    this.phydef = 14;
    this.phydefMax = 14;
    this.magstr = 19;
    this.magstrMax = 19;
    this.magdef = 13;
    this.magdefMax = 13;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Black Mage";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Soul Heal";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Fire";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 10;

    this.abilityFourDescription = "Hellfire";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 75;

    this.abilityFiveDescription = "Water";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 10;

    this.abilitySixDescription = "Tsunami";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 75;

    this.abilitySevenDescription = "Shadow";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 20;

    this.abilityEightDescription = "Tenebrae";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.oneMPCost = false;
    this.abilityNineDescription = "MP-Regen";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 200;

    this.battleRegen = false;
    this.abilityTenDescription = "1 MP";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 400;
    Entity.call(this, game, 380, 380);
}
BMage.prototype = new Entity();
BMage.prototype.constructor = BMage;
BMage.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.mp = this.mpMax;
        this.mpMax += 2;
        this.phystr += 2;
        this.phydef += 3;
        this.magstr += 2;
        this.magdef += 2;
        this.phystrMax += 2;
        this.phydefMax += 3;
        this.magstrMax += 2;
        this.magdefMax += 2;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

BMage.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.magstr - selectedEnemy.magdef);
    }
}
BMage.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
            ctx.fillText("-" + (hero.currentClass.magstr - selectedEnemy.magdef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
BMage.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
    if (hero.currentClass.hp > hero.currentClass.hpMax) {
        hero.currentClass.hp = hero.currentClass.hpMax;
    }
    hero.currentClass.mp = hero.currentClass.mp + (cost);
    if (hero.currentClass.mp > hero.currentClass.mpMax) {
        hero.currentClass.mp = hero.currentClass.mpMax;
    }
}
BMage.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("+" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
BMage.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 10;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Fire") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Fire") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 10);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 10);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;
        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Fire") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Fire") strongToFire = true;
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (weakToFire) {
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else if (strongToFire) {
                ctx.fillStyle = "Green";
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                    if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                        ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                    } else {
                        ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Fire") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Fire") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Fire") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Fire") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Fire") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Fire") strongToFire3 = true;
        }
    }

    if (hero.currentClass.mp >= cost) {
        if (firstEnemy != null) {
            if (weakToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp - i;
            } else if (strongToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - firstEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - firstEnemy.magdef);
                    firstEnemy.hp = firstEnemy.hp - i;
                }
            }
        }
        if (secondEnemy != null) {
            if (weakToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp - i;
            } else if (strongToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - secondEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - secondEnemy.magdef);
                    secondEnemy.hp = secondEnemy.hp - i;
                }
            }
        }
        if (thirdEnemy != null) {
            if (weakToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp - i;
            } else if (strongToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                }
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Fire") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Fire") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Fire") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Fire") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Fire") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Fire") strongToFire3 = true;
        }
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (firstEnemy != null) {
                if (weakToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else if (strongToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("+" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - firstEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - firstEnemy.magdef);
                        ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                    } else {
                        ctx.fillText("0", firstEnemy.x - 10, firstEnemy.y - 5);
                    }
                }
            }
            if (secondEnemy != null) {
                if (weakToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp - i;
                } else if (strongToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    ctx.fillText("+" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - secondEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - secondEnemy.magdef);
                        ctx.fillText("-" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                    } else {
                        ctx.fillText("0", secondEnemy.x - 10, secondEnemy.y - 5);
                    }
                }
            }
            if (thirdEnemy != null) {
                if (weakToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                } else if (strongToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    ctx.fillText("+" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                        ctx.fillText("-" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                    } else {
                        ctx.fillText("0", thirdEnemy.x - 10, thirdEnemy.y - 5);
                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (weakToFire) {
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else if (strongToFire) {
                ctx.fillStyle = "Green";
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                    if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                        ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                    } else {
                        ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Water") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Water") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Water") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Water") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Water") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Water") strongToFire3 = true;
        }
    }

    if (hero.currentClass.mp >= cost) {
        if (firstEnemy != null) {
            if (weakToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp - i;
            } else if (strongToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - firstEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - firstEnemy.magdef);
                    firstEnemy.hp = firstEnemy.hp - i;
                }
            }
        }
        if (secondEnemy != null) {
            if (weakToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp - i;
            } else if (strongToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - secondEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - secondEnemy.magdef);
                    secondEnemy.hp = secondEnemy.hp - i;
                }
            }
        }
        if (thirdEnemy != null) {
            if (weakToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp - i;
            } else if (strongToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                }
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Water") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Water") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Water") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Water") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Water") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Water") strongToFire3 = true;
        }
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (firstEnemy != null) {
                if (weakToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else if (strongToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("+" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - firstEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - firstEnemy.magdef);
                        ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                    } else {
                        ctx.fillText("0", firstEnemy.x - 10, firstEnemy.y - 5);
                    }
                }
            }
            if (secondEnemy != null) {
                if (weakToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp - i;
                } else if (strongToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    ctx.fillText("+" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - secondEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - secondEnemy.magdef);
                        ctx.fillText("-" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                    } else {
                        ctx.fillText("0", secondEnemy.x - 10, secondEnemy.y - 5);
                    }
                }
            }
            if (thirdEnemy != null) {
                if (weakToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                } else if (strongToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    ctx.fillText("+" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                        ctx.fillText("-" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                    } else {
                        ctx.fillText("0", thirdEnemy.x - 10, thirdEnemy.y - 5);
                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Shadow") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Shadow") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Shadow") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Shadow") strongToFire = true;
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (weakToFire) {
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else if (strongToFire) {
                ctx.fillStyle = "Green";
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                    if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                        ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                    } else {
                        ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Shadow") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Shadow") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Shadow") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Shadow") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Shadow") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Shadow") strongToFire3 = true;
        }
    }

        if (hero.currentClass.mp >= cost) {
            if (firstEnemy != null) {
                if (weakToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    firstEnemy.hp = firstEnemy.hp - i;
                } else if (strongToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    firstEnemy.hp = firstEnemy.hp + i;
                } else {
                    if (hero.currentClass.magstr - firstEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - firstEnemy.magdef);
                        firstEnemy.hp = firstEnemy.hp - i;
                    }
                }
            }
            if (secondEnemy != null) {
                if (weakToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp - i;
                } else if (strongToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp + i;
                } else {
                    if (hero.currentClass.magstr - secondEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - secondEnemy.magdef);
                        secondEnemy.hp = secondEnemy.hp - i;
                    }
                }
            }
            if (thirdEnemy != null) {
                if (weakToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                } else if (strongToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp + i;
                } else {
                    if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                        thirdEnemy.hp = thirdEnemy.hp - i;
                    }
                }
            }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
BMage.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;

    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Shadow") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Shadow") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Shadow") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Shadow") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Shadow") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Shadow") strongToFire3 = true;
        }
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (firstEnemy != null) {
                if (weakToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else if (strongToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("+" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - firstEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - firstEnemy.magdef);
                        ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                    } else {
                        ctx.fillText("0", firstEnemy.x - 10, firstEnemy.y - 5);
                    }
                }
            }
            if (secondEnemy != null) {
                if (weakToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp - i;
                } else if (strongToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    ctx.fillText("+" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - secondEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - secondEnemy.magdef);
                        ctx.fillText("-" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                    } else {
                        ctx.fillText("0", secondEnemy.x - 10, secondEnemy.y - 5);
                    }
                }
            }
            if (thirdEnemy != null) {
                if (weakToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                } else if (strongToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    ctx.fillText("+" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                        ctx.fillText("-" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                    } else {
                        ctx.fillText("0", thirdEnemy.x - 10, thirdEnemy.y - 5);
                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
BMage.prototype.abilityNine = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.battleRegen = true;
}
BMage.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
BMage.prototype.abilityTen = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.oneMPCost = true;
}
BMage.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
BMage.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}
function WMage(game) {
    this.level = 1;
    this.cen = 2;
    this.col = 0;
    this.hp = 85;
    this.hpMax = 85;
    this.hpRegen = 15;
    this.mp = 70;
    this.mpMax = 70;
    this.mpRegen = 8;
    this.phystr = 2;
    this.phystrMax = 2;
    this.phydef = 15;
    this.phydefMax = 15;
    this.magstr = 15;
    this.magstrMax = 15;
    this.magdef = 15;
    this.magdefMax = 15;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "White Mage";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Pray";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Vigor";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 25;

    this.abilityFourDescription = "Cure";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 50;

    this.abilityFiveDescription = "Cura";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 100;

    this.abilitySixDescription = "Holy";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 100;

    this.abilitySevenDescription = "Holy Blast";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 400;

    this.abilityEightDescription = "Curaga";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 300;

    this.oneMPCost = false;
    this.abilityNineDescription = "MP-Regen";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 200;

    this.battleRegen = false;
    this.abilityTenDescription = "1 MP";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 400;
    Entity.call(this, game, 380, 380);
}
WMage.prototype = new Entity();
WMage.prototype.constructor = WMage;
WMage.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 7;
        this.hp = this.hpMax;
        this.mpMax += 7;
        this.mp = this.mpMax;

        this.phystr += 1;
        this.phydef += 3;
        this.magstr += 3;
        this.magdef += 3;
        this.phystrMax += 1;
        this.phydefMax += 3;
        this.magstrMax += 3;
        this.magdefMax += 3;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

WMage.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time) {
    if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.magstr - selectedEnemy.magdef);
    }
}
WMage.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
            ctx.fillText("-" + (hero.currentClass.magstr - selectedEnemy.magdef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
WMage.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    hero.currentClass.hp += hero.currentClass.hpRegen;
    if (hero.currentClass.hp > hero.currentClass.hpMax) {
        hero.currentClass.hp = hero.currentClass.hpMax;
    }
    hero.currentClass.mp += hero.currentClass.mpRegen;
    if (hero.currentClass.mp > hero.currentClass.mpMax) {
        hero.currentClass.mp = hero.currentClass.mpMax;
    }
}
WMage.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("+" + hero.currentClass.hpRegen, hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("+" + hero.currentClass.mpRegen, hero.x + 50, hero.y + 50);
        }

    }
}
WMage.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (hero.currentClass.mp > cost) {
        hero.currentClass.hp += hero.currentClass.hpRegen*5;
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
        hero.currentClass.mp -= cost;
    }

}
WMage.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp > cost) {
            ctx.fillText("+" + hero.currentClass.hpRegen*5, hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;

    if (hero.currentClass.mp > cost) {
        for (var i = 0; i < this.game.classSystem.length; i++) {
            this.game.classSystem[i].hp += hero.currentClass.hpRegen * 5;
            if (this.game.classSystem[i].hp > this.game.classSystem[i].hp.hpMax) {
                this.game.classSystem[i].hp = this.game.classSystem[i].hp.hpMax;
            }
        }

        hero.currentClass.mp -= cost;
    }
}
WMage.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp > cost) {
            ctx.fillText("+" + hero.currentClass.hpRegen * 5, hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 8;

    if (hero.currentClass.mp > cost) {
        for (var i = 0; i < this.game.classSystem.length; i++) {
            this.game.classSystem[i].hp += hero.currentClass.hpRegen * 15;
            if (this.game.classSystem[i].hp > this.game.classSystem[i].hp.hpMax) {
                this.game.classSystem[i].hp = this.game.classSystem[i].hp.hpMax;
            }
        }

        hero.currentClass.mp -= cost;
    }
}
WMage.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp > cost) {
            ctx.fillText("+" + hero.currentClass.hpRegen * 15, hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 7;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Light") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Light") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
WMage.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 7;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Shadow") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Shadow") strongToFire = true;
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (weakToFire) {
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else if (strongToFire) {
                ctx.fillStyle = "Green";
                var i = Math.abs((hero.currentClass.magstr - selectedEnemy.magdef) * 5);
                ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                    if (hero.currentClass.magstr - selectedEnemy.magdef > 0) {
                        var i = (hero.currentClass.magstr - selectedEnemy.magdef);
                        ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                    } else {
                        ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;
    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Shadow") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Shadow") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Shadow") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Shadow") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Shadow") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Shadow") strongToFire3 = true;
        }
    }

    if (hero.currentClass.mp >= cost) {
        if (firstEnemy != null) {
            if (weakToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp - i;
            } else if (strongToFire1) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                firstEnemy.hp = firstEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - firstEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - firstEnemy.magdef);
                    firstEnemy.hp = firstEnemy.hp - i;
                }
            }
        }
        if (secondEnemy != null) {
            if (weakToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp - i;
            } else if (strongToFire2) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                secondEnemy.hp = secondEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - secondEnemy.magdef > 0) {
                    var i = (hero.currentClass.magstr - secondEnemy.magdef);
                    secondEnemy.hp = secondEnemy.hp - i;
                }
            }
        }
        if (thirdEnemy != null) {
            if (weakToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp - i;
            } else if (strongToFire3) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                thirdEnemy.hp = thirdEnemy.hp + i;
            } else {
                if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                }
            }
        }
        if (hero.currentClass.oneMPCost) cost = 1;

        hero.currentClass.mp -= cost;
    }
}
WMage.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 28;
    var weakToFire1 = false;
    var weakToFire2 = false;
    var weakToFire3 = false;
    var strongToFire1 = false;
    var strongToFire2 = false;
    var strongToFire3 = false;

    if (firstEnemy != null) {
        for (var i = 0; i < firstEnemy.weakness.length; i++) {
            if (firstEnemy.weakness[i] === "Light") weakToFire1 = true;
        }
        for (var i = 0; i < firstEnemy.strength.length; i++) {
            if (firstEnemy.strength[i] === "Light") strongToFire1 = true;
        }
    }

    if (secondEnemy != null) {
        for (var i = 0; i < secondEnemy.weakness.length; i++) {
            if (secondEnemy.weakness[i] === "Light") weakToFire2 = true;
        }
        for (var i = 0; i < secondEnemy.strength.length; i++) {
            if (secondEnemy.strength[i] === "Light") strongToFire2 = true;
        }
    }

    if (thirdEnemy != null) {
        for (var i = 0; i < thirdEnemy.weakness.length; i++) {
            if (thirdEnemy.weakness[i] === "Light") weakToFire3 = true;
        }
        for (var i = 0; i < thirdEnemy.strength.length; i++) {
            if (thirdEnemy.strength[i] === "Light") strongToFire3 = true;
        }
    }
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            if (firstEnemy != null) {
                if (weakToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else if (strongToFire1) {
                    var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 20);
                    ctx.fillText("+" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - firstEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - firstEnemy.magdef);
                        ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
                    } else {
                        ctx.fillText("0", firstEnemy.x - 10, firstEnemy.y - 5);
                    }
                }
            }
            if (secondEnemy != null) {
                if (weakToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    secondEnemy.hp = secondEnemy.hp - i;
                } else if (strongToFire2) {
                    var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 20);
                    ctx.fillText("+" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - secondEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - secondEnemy.magdef);
                        ctx.fillText("-" + i, secondEnemy.x - 10, secondEnemy.y - 5);
                    } else {
                        ctx.fillText("0", secondEnemy.x - 10, secondEnemy.y - 5);
                    }
                }
            }
            if (thirdEnemy != null) {
                if (weakToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    thirdEnemy.hp = thirdEnemy.hp - i;
                } else if (strongToFire3) {
                    var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 20);
                    ctx.fillText("+" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    if (hero.currentClass.magstr - thirdEnemy.phydef > 0) {
                        var i = (hero.currentClass.magstr - thirdEnemy.magdef);
                        ctx.fillText("-" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
                    } else {
                        ctx.fillText("0", thirdEnemy.x - 10, thirdEnemy.y - 5);
                    }
                }
            }
            ctx.fillStyle = "Blue";
            if (hero.currentClass.oneMPCost) cost = 1;

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 16;

    if (hero.currentClass.mp > cost) {
        for (var i = 0; i < this.game.classSystem.length; i++) {
            this.game.classSystem[i].hp += hero.currentClass.hpRegen * 32;
            if (this.game.classSystem[i].hp > this.game.classSystem[i].hp.hpMax) {
                this.game.classSystem[i].hp = this.game.classSystem[i].hp.hpMax;
            }
        }

        hero.currentClass.mp -= cost;
    }
}
WMage.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 16;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp > cost) {
            ctx.fillText("+" + hero.currentClass.hpRegen * 32, hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
WMage.prototype.abilityNine = function (hero) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.battleRegen = true;

}
WMage.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
WMage.prototype.abilityTen = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.oneMPCost = true;

}
WMage.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
WMage.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}
function Warrior(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 100;
    this.hpMax = 100;
    this.hpRegen = 9;
    this.mp = 17;
    this.mpMax = 17;
    this.mpRegen = 2;
    this.phystr = 17;
    this.phystrMax = 17;
    this.phydef = 15;
    this.phydefMax = 15;
    this.magstr = 10;
    this.magstrMax = 10;
    this.magdef = 13;
    this.magdefMax = 13;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Warrior";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Aura Heal";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Sentinel";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 5;

    this.abilityFourDescription = "Power Break";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 10;

    this.abilityFiveDescription = "Armor Break";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 40;

    this.abilitySixDescription = "Magic Break";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 70;

    this.abilitySevenDescription = "Full Break";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Omni Break";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 300;

    this.protect = 0;
    this.abilityNineDescription = "Protect";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.assault = 0;
    this.abilityTenDescription = "Assault";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Warrior.prototype = new Entity();
Warrior.prototype.constructor = Warrior;
Warrior.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.mp = this.mpMax;
        this.mpMax += 2;
        this.phystr += 2;
        this.phydef += 3;
        this.magstr += 2;
        this.magdef += 2;
        this.phystrMax += 2;
        this.phydefMax += 3;
        this.magstrMax += 2;
        this.magdefMax += 2;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Warrior.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.magstr - selectedEnemy.magdef);
    }
}
Warrior.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
            ctx.fillText("-" + (hero.currentClass.magstr - selectedEnemy.magdef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
Warrior.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;

        }
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Warrior.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.phydef += 1 + this.protect;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("Defense Up", hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Warrior.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.phystr -= 1 + this.assault;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("Power Down", selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Warrior.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.phydef -= 1 + this.assault;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("Defense Down", selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Warrior.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.magstr -= 1 + this.assault;
        selectedEnemy.magdef -= 1 + this.assault;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("Magic Down", selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Warrior.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.magstr-=1+this.assault;
        selectedEnemy.magdef -= 1 + this.assault;
        selectedEnemy.phydef -= 1 + this.assault;
        selectedEnemy.phydef -= 1 + this.assault;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("All Down", selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Warrior.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.magstr -= 1 + this.assault;
        firstEnemy.magdef -= 1 + this.assault;
        firstEnemy.phydef -= 1 + this.assault;
        firstEnemy.phydef -= 1 + this.assault;

        secondEnemy.magstr -= 1 + this.assault;
        secondEnemy.magdef -= 1 + this.assault;
        secondEnemy.phydef -= 1 + this.assault;
        secondEnemy.phydef -= 1 + this.assault;

        thirdEnemy.magstr -= 1 + this.assault;
        thirdEnemy.magdef -= 1 + this.assault;
        thirdEnemy.phydef -= 1 + this.assault;
        thirdEnemy.phydef -= 1 + this.assault;
        hero.currentClass.mp -= cost;
    }
}
Warrior.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("All Down", firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("All Down", secondEnemy.x - 10, secondEnemy.y - 5);

        ctx.fillText("All Down", thirdEnemy.x - 10, thirdEnemy.y - 5);

        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > 0) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Warrior.prototype.abilityNine = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.protect = hero.level;
}
Warrior.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Warrior.prototype.abilityTen = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.assault = hero.level + hero.phystr + hero.magstr;
}
Warrior.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Warrior.prototype.draw = function (ctx, x, y,size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}


function Samurai(game) {
    this.level = 1;
    this.cen = 5;
    this.col = 0;
    this.hp = 100;
    this.hpMax = 100;
    this.hpRegen = 3;
    this.mp = 26;
    this.mpMax = 26;
    this.mpRegen = 2;
    this.phystr = 12;
    this.phystrMax = 12;
    this.phydef = 17;
    this.phydefMax = 17;
    this.magstr = 12;
    this.magstrMax = 12;
    this.magdef = 17;
    this.magdefMax = 17;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Samurai";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Healing Mirror";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.fivepointExplodingHeartTechnique = 0;
    this.abilityThreeDescription = "Hanzo";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Muramasa";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 18;

    this.abilityFiveDescription = "Tessaiga";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 30;

    this.abilitySixDescription = "Caldabolg";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 40;

    this.abilitySevenDescription = "Zangetsu";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 70;

    this.abilityEightDescription = "Tensa Zangetsu";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Momentum";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 80;
    this.innerPeace = false;
    this.abilityTenDescription = "Inner Peace";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 700;
    Entity.call(this, game, 380, 380);
}
Samurai.prototype = new Entity();
Samurai.prototype.constructor = Samurai;
Samurai.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 12;
        this.hp = this.hpMax;
        this.mpMax += 2;
        this.mp = this.mpMax;

        this.phystr += 7;
        this.phydef += 3;
        this.magstr += 2;
        this.magdef += 2;
        this.phystrMax += 2;
        this.phydefMax += 3;
        this.magstrMax += 2;
        this.magdefMax += 2;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Samurai.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time) {
    if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr - selectedEnemy.phydef);
    }
}
Samurai.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
            ctx.fillText("-" + (hero.currentClass.phystr - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
Samurai.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;

        }
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("+" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Samurai.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 5;
    if (hero.currentClass.mp > cost) {
        hero.fivepointExplodingHeartTechnique++;
        if (hero.fivepointExplodingHeartTechnique === 5) {
            selectedEnemy.hp -= selectedEnemy.hp;
            hero.fivepointExplodingHeartTechnique = 0;
        } else {
            if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                selectedEnemy.hp = selectedEnemy.hp - hero.currentClass.phystr;
            }
        }
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        if (hero.currentClass.mp > cost) {
            if (hero.fivepointExplodingHeartTechnique === 5) {
                ctx.fillText("-" + (selectedEnemy.hp), selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.phystr - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
            if (hero.currentClass.mp > hero.currentClass.mpMax) {
                ctx.fillStyle = "Blue";
                ctx.fillText("+" + cost, hero.x + 50, hero.y + 50);
            }
    }

    }
}
Samurai.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 7;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.phystr);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
        selectedEnemy.hp -= hero.currentClass.phystr;
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if (hero.currentClass.mp >= cost) {
        ctx.fillText("-" + hero.currentClass.phystr, selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Green"
        ctx.fillText("+" + (hero.currentClass.phystr).toFixed(2), hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
            ctx.fillText("+" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Samurai.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 7;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.hp = firstEnemy.hp - hero.currentClass.phystr;

        secondEnemy.hp = secondEnemy.hp - hero.currentClass.phystr;

        thirdEnemy.hp = thirdEnemy.hp - hero.currentClass.phystr;
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 7;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Samurai.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else if (strongToFire) {
            ctx.fillStyle = "Green";
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                    ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Samurai.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 15;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.hp = firstEnemy.hp - hero.currentClass.phystr*5;

        secondEnemy.hp = secondEnemy.hp - hero.currentClass.phystr * 5;

        thirdEnemy.hp = thirdEnemy.hp - hero.currentClass.phystr * 5;
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 15;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr*5, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 5, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 5, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Samurai.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 15;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.hp = firstEnemy.hp - hero.currentClass.phystr * 50;

        secondEnemy.hp = secondEnemy.hp - hero.currentClass.phystr * 50;

        thirdEnemy.hp = thirdEnemy.hp - hero.currentClass.phystr * 50;
        hero.currentClass.mp -= cost;
    }
}
Samurai.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 15;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr * 50, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 50, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 50, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Samurai.prototype.abilityNine = function (hero) {
    var str = 0;
    if (firstEnemy.hp < 0) str += firstEnemy.phystr;
    if (secondEnemy.hp < 0) str += secondEnemy.phystr;
    if (thirdEnemy.hp < 0) str += thirdEnemy.phystr;

    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.currentClass.phystr += str;

}
Samurai.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Samurai.prototype.abilityTen = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.innerPeace = true;
}
Samurai.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Samurai.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}
function DKnight(game) {
    this.level = 1;
    this.cen = 8;
    this.col = 4;
    this.hp = 200;
    this.hpMax = 200;
    this.hpRegen = 0;
    this.mp = 30;
    this.mpMax = 30;
    this.mpRegen = 5;
    this.phystr = 20;
    this.phystrMax = 20;
    this.phydef = 15;
    this.phydefMax = 15;
    this.magstr = 10;
    this.magstrMax = 10;
    this.magdef = 15;
    this.magdefMax = 15;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Dark Knight";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Consume";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Dark Shot";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 10;

    this.abilityFourDescription = "Dark Blast";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 25;

    this.abilityFiveDescription = "Dark Wave";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 40;
    this.dkRandom = 0;
    this.abilitySixDescription = "Dark Sky";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 100;

    this.abilitySevenDescription = "Hades";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 500;

    this.abilityEightDescription = "Charon";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 300;

    this.releaseD = false;
    this.abilityNineDescription = "Release Darkness";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.tentacles = false;
    this.abilityTenDescription = "Tentacles";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 30;
    Entity.call(this, game, 380, 380);
}
DKnight.prototype = new Entity();
DKnight.prototype.constructor = DKnight;
DKnight.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 10;
        this.hp = this.hpMax;
        this.mpMax += 6;
        this.mp = this.mpMax;

        this.phystr += 5;
        this.phydef += 1;
        this.magstr += 4;
        this.magdef += 1;
        this.phystrMax += 4;
        this.phydefMax += 1;
        this.magstrMax += 4;
        this.magdefMax += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

DKnight.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time) {
    if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.magstr - selectedEnemy.magdef);
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
            ctx.fillText("-" + (hero.currentClass.magstr - selectedEnemy.magdef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
        selectedEnemy.hp -= hero.currentClass.mp;
        hero.currentClass.mp -= cost;
    }

}
DKnight.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"

        ctx.fillText("-" + hero.currentClass.mp, selectedEnemy.x - 10, selectedEnemy.y - 5);
        ctx.fillStyle = "Green"
        ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > hero.currentClass.mpMax) {
            ctx.fillText("+" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
DKnight.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    selectedEnemy.hp -= hero.currentClass.phystr * 2;
    if (!hero.currentclass.releaseD) {
        hero.currentClass.hp -= hero.currentClass.phystr * 2;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.phystr * 2);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr * 2, selectedEnemy.x - 10, selectedEnemy.y - 5);
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + hero.currentClass.phystr * 2, hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    selectedEnemy.hp -= hero.currentClass.phystr * 5;
    if (!hero.currentclass.releaseD) {
        hero.currentClass.hp -= hero.currentClass.phystr * 5;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.phystr * 5);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr * 5, selectedEnemy.x - 10, selectedEnemy.y - 5);
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + hero.currentClass.phystr * 5, hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    firstEnemy.hp -= hero.currentClass.phystr * 10;
    secondEnemy.hp -= hero.currentClass.phystr * 10;
    thirdEnemy.hp -= hero.currentClass.phystr * 10;
    if (!hero.currentclass.releaseD) {
        hero.currentClass.hp -= hero.currentClass.phystr * 10;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.phystr * 10);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr * 10, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 10, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * 10, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + hero.currentClass.phystr * 10, hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    hero.currentClass.dkRandom = Math.random() * (1000 - 1) + 1;
    var damage = 1;
    if (hero.currentClass.dkRandom % 666 === 0) {
        damage = 1000;
    } else if (hero.currentClass.dkRandom % 777 === 0) {
        damage = 10;
    }
    firstEnemy.hp -= hero.currentClass.phystr * damage;
    secondEnemy.hp -= hero.currentClass.phystr * damage;
    thirdEnemy.hp -= hero.currentClass.phystr * damage;
    if (!hero.currentclass.releaseD) {
        hero.currentClass.hp -= hero.currentClass.phystr * damage;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.phystr * damage);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        var damage = 1;
        if (hero.currentClass.dkRandom % 666 === 0) {
            damage = 1000;
        } else if (hero.currentClass.dkRandom % 777 === 0) {
            damage = 10;
        }
        ctx.fillText("-" + hero.currentClass.phystr * damage, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * damage, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr * damage, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + hero.currentClass.phystr * damage, hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    hero.currentClass.dkRandom = Math.random() * (1000 - 1) + 1;
    var damage = 1;
    if (hero.currentClass.dkRandom % 100 === 0) {
        firstEnemy.hp -= hero.currentClass.phystr * damage;
        secondEnemy.hp -= hero.currentClass.phystr * damage;
        thirdEnemy.hp -= hero.currentClass.phystr * damage;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        var damage = 1;
        if (hero.currentClass.dkRandom % 100 === 0) {
            ctx.fillText("-" + hero.currentClass.phystr * damage, firstEnemy.x - 10, firstEnemy.y - 5);
            ctx.fillText("-" + hero.currentClass.phystr * damage, secondEnemy.x - 10, secondEnemy.y - 5);
            ctx.fillText("-" + hero.currentClass.phystr * damage, thirdEnemy.x - 10, thirdEnemy.y - 5);
        }        
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    hero.currentClass.dkRandom = Math.random() * (1000 - 1) + 1;
    var damage = 1;
    if (hero.currentClass.dkRandom % 100 === 0) {
        selectedEnemy.hp -= hero.currentClass.phystr * damage;
    }
    if (hero.tentacles) {
        hero.currentClass.hp = hero.currentClass.hp + (hero.currentClass.mp);
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
    }
}
DKnight.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        var damage = 1;
        if (hero.currentClass.dkRandom % 100 === 0) {
            ctx.fillText("-" + hero.currentClass.phystr * damage, selectedEnemy.x - 10, selectedEnemy.y - 5);
        }
        if (hero.tentacles) {
            ctx.fillStyle = "Green"
            ctx.fillText("+" + (hero.currentClass.mp).toFixed(2), hero.x + 25, hero.y - 5);
        }
    }
}
DKnight.prototype.abilityNine = function (hero) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.releaseD = true;
}
DKnight.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
DKnight.prototype.abilityTen = function (hero) {

    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.tentacles = true;
}
DKnight.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
DKnight.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}

function Berserker(game) {
    this.level = 1;
    this.cen = 5;
    this.col = 4;
    this.hp = 175;
    this.hpMax = 175;
    this.hpRegen = 8;
    this.mp = 14;
    this.mpMax = 14;
    this.mpRegen = 1;
    this.phystr = 17;
    this.phystrMax = 17;
    this.phydef = 18;
    this.phydefMax = 18;
    this.magstr = 2;
    this.magstrMax = 2;
    this.magdef = 10;
    this.magdefMax = 10;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Berserker";
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Healing Roar";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Cripple";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 10;

    this.abilityFourDescription = "Mad Rush";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 20;

    this.abilityFiveDescription = "Crackdown";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 30;

    this.abilitySixDescription = "Hurt";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 40;

    this.howl = false;
    this.abilitySevenDescription = "Howl";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.beserk = 0;
    this.abilityEightDescription = "Beserk";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.counter = false;
    this.abilityNineDescription = "Counterattack";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 250;

    this.evade = false;
    this.abilityTenDescription = "Evade & Counter";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 500;
    Entity.call(this, game, 380, 380);
}
Berserker.prototype = new Entity();
Berserker.prototype.constructor = Berserker;
Berserker.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 18;
        this.hp = this.hpMax;
        this.mpMax += 6;
        this.mp = this.mpMax;

        this.phystr += 5;
        this.phydef += 3;
        this.magstr += 1;
        this.magdef += 1;
        this.phystrMax += 5;
        this.phydefMax += 3;
        this.magstrMax += 1;
        this.magdefMax += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Berserker.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr - selectedEnemy.phydef);
    }
}
Berserker.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.phystr - selectedEnemy.phydef) > 0) {
            ctx.fillText("-" + (hero.currentClass.phystr - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
Berserker.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 5;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + 13;
        if (hero.currentClass.hp > hero.currentClass.hpMax && !this.howl) {
            hero.currentClass.hp = hero.currentClass.hpMax;
        }
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        ctx.fillText("+" + 13, hero.x + 25, hero.y - 5);
        ctx.fillStyle = "Blue";
        if (hero.currentClass.mp > 0) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Berserker.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 10;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.hp = selectedEnemy.hp - hero.currentClass.phystr;
        selectedEnemy.phydef -= hero.currentClass.phystr;
        if (selectedEnemy.phydef < 0) selectedEnemy.phydef = 0;
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 10;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr, selectedEnemy.x - 10, selectedEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 25;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.hp = firstEnemy.hp - hero.currentClass.phystr;
        firstEnemy.phydef -= hero.currentClass.phystr;
        if (firstEnemy.phydef < 0) firstEnemy.phydef = 0;

        secondEnemy.hp = secondEnemy.hp - hero.currentClass.phystr;
        secondEnemy.phydef -= hero.currentClass.phystr;
        if (secondEnemy.phydef < 0) secondEnemy.phydef = 0;

        thirdEnemy.hp = thirdEnemy.hp - hero.currentClass.phystr;
        thirdEnemy.phydef -= hero.currentClass.phystr;
        if (thirdEnemy.phydef < 0) thirdEnemy.phydef = 0;
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 25;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 25;
    if (hero.currentClass.mp >= cost) {
        firstEnemy.hp = firstEnemy.hp - hero.currentClass.phystr;
        firstEnemy.phystr -= hero.currentClass.phystr;
        if (firstEnemy.phystr < 0) firstEnemy.phystr = 0;

        secondEnemy.hp = secondEnemy.hp - hero.currentClass.phystr;
        secondEnemy.phystr -= hero.currentClass.phystr;
        if (secondEnemy.phystr < 0) secondEnemy.phystr = 0;

        thirdEnemy.hp = thirdEnemy.hp - hero.currentClass.phystr;
        thirdEnemy.phystr -= hero.currentClass.phystr;
        if (thirdEnemy.phystr < 0) thirdEnemy.phystr = 0;
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 25;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.phystr, firstEnemy.x - 10, firstEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, secondEnemy.x - 10, secondEnemy.y - 5);
        ctx.fillText("-" + hero.currentClass.phystr, thirdEnemy.x - 10, thirdEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"

            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 0;
    if (hero.currentClass.mp >= cost) {
        selectedEnemy.hp = selectedEnemy.hp - hero.currentClass.hp;
        selectedEnemy.phystr -= hero.currentClass.phystr;
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 0;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + hero.currentClass.hp, firstEnemy.x - 10, firstEnemy.y - 5);
        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "Blue"
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (!hero.howl) {
        hero.howl = !hero.howl;
        hero.currentClass.hp = hero.currentClass.hp * 2;
        hero.currentClass.mp -= cost;
    }
}
Berserker.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 0;

    if (time < 0.75) {
        ctx.fillStyle = "green";
        ctx.fillText("Double HP" + hero.x + 25, hero.y - 5);

        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "blue";
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 10 * (hero.beserk + 1);
    if (selectedEnemy.hp > 1000000) cost = 0;
    hero.currentClass.phystr = hero.currentClass.phystr * cost;
    hero.currentClass.mp -= cost;
}
Berserker.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 10 * (hero.beserk + 1);
    if (selectedEnemy.hp > 1000000) cost = 0;

    if (time < 0.75) {
        ctx.fillStyle = "green";
        ctx.fillText("Beserk" + hero.x + 25, hero.y - 5);

        if (hero.currentClass.mp > 0) {
            ctx.fillStyle = "blue";
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }
    }
}
Berserker.prototype.abilityNine = function (hero) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.counter = true;

}
Berserker.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Berserker.prototype.abilityTen = function (hero) {

    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.evade = true;
}
Berserker.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Berserker.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}

function Psychic(game) {
    this.level = 1;
    this.cen = 2;
    this.col = 4;
    this.hp = 80;
    this.hpMax = 80;
    this.hpRegen = 1;
    this.mp = 40;
    this.mpMax = 40;
    this.mpRegen = 3;
    this.phystr = 18;
    this.phystrMax = 18;
    this.phydef = 14;
    this.phydefMax = 14;
    this.magstr = 21;
    this.magstrMax = 21;
    this.magdef = 14;
    this.magdefMax = 14;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Psychic";
    this.physGuard = false;
    this.magGuard = false;
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/FinalFantasyX_zps39dfae2a.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.pastDamage = 0;
    this.abilityTwoDescription = "Reverse Time";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Pyschic Bomb";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 10;

    this.abilityFourDescription = "Telekinesis";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 10;

    this.abilityFiveDescription = "Pyrokinesis";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 15;

    this.abilitySixDescription = "Aquakinesis";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 30;

    this.abilitySevenDescription = "Void";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 70;

    this.abilityEightDescription = "Brainstorm";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Magic Guard";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 300;

    this.abilityTenDescription = "Physics Guard";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 400;
    Entity.call(this, game, 380, 380);
}
Psychic.prototype = new Entity();
Psychic.prototype.constructor = Psychic;
Psychic.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.level += 1;
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.mpMax += 7;
        this.mp = this.mpMax;

        this.phystr += 4;
        this.phydef += 1;
        this.magstr += 4;
        this.magdef += 1;
        this.phystrMax += 4;
        this.phydefMax += 1;
        this.magstrMax += 4;
        this.magdefMax += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Psychic.prototype.abilityOne = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
        selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.magstr - selectedEnemy.magdef);
    }
}
Psychic.prototype.abilityOneDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((hero.currentClass.magstr - selectedEnemy.magdef) > 0) {
            ctx.fillText("-" + (hero.currentClass.magstr - selectedEnemy.magdef), selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

        }
    }
}
Psychic.prototype.abilityTwo = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 5;
    if (hero.currentClass.mp >= cost) {
        hero.currentClass.hp = hero.currentClass.hp + hero.currentClass.pastDamage;
        if (hero.currentClass.hp > hero.currentClass.hpMax) {
            hero.currentClass.hp = hero.currentClass.hpMax;

        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilityTwoDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        ctx.fillStyle = "Green"
        if (hero.currentClass.mp >= cost) {
            ctx.fillText("+" + hero.currentClass.pastDamage, hero.x + 25, hero.y - 5);
            ctx.fillStyle = "Blue";
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
        }

    }
}
Psychic.prototype.abilityThree = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 10;
    if (hero.currentClass.mp >= cost) {
        if (firstEnemy != null) {
            if ((hero.currentClass.magstr - firstEnemy.magdef) > 0) {
                firstEnemy.hp = firstEnemy.hp - (hero.currentClass.magstr - firstEnemy.magdef);
            }
        }
        if (secondEnemy != null) {
            if ((hero.currentClass.magstr - secondEnemy.magdef) > 0) {
                secondEnemy.hp = secondEnemy.hp - (hero.currentClass.magstr - secondEnemy.magdef);
            }
        }
        if (thirdEnemy != null) {
            if ((hero.currentClass.magstr - thirdEnemy.magdef) > 0) {
                thirdEnemy.hp = thirdEnemy.hp - (hero.currentClass.magstr - thirdEnemy.magdef);
            }
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilityThreeDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 10;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        if (hero.currentClass.mp >= cost) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
            if (firstEnemy != null) {
                if ((hero.currentClass.magstr - firstEnemy.magdef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.magstr - firstEnemy.magdef), firstEnemy.x - 10, firstEnemy.y - 5);
                } else {
                    ctx.fillText("0", firstEnemy.x - 10, firstEnemy.y - 5);
                }
            }
            if (secondEnemy != null) {
                if ((hero.currentClass.magstr - secondEnemy.magdef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.magstr - secondEnemy.magdef), secondEnemy.x - 10, secondEnemy.y - 5);
                } else {
                    ctx.fillText("0", secondEnemy.x - 10, secondEnemy.y - 5);
                }
            }
            if (thirdEnemy != null) {
                if ((hero.currentClass.magstr - thirdEnemy.magdef) > 0) {
                    ctx.fillText("-" + (hero.currentClass.magstr - thirdEnemy.magdef), thirdEnemy.x - 10, thirdEnemy.y - 5);
                } else {
                    ctx.fillText("0", thirdEnemy.x - 10, thirdEnemy.y - 5);
                }
            }

        }

    }
}
Psychic.prototype.abilityFour = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    if (hero.currentClass.mp >= cost) {
        if ((hero.currentClass.magstr) > selectedEnemy.magdef) {
            var i = (hero.currentClass.magstr - selectedEnemy.magdef) * (hero.currentClass.magstr - selectedEnemy.magdef);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else {
            selectedEnemy.hp = selectedEnemy.hp - (hero.currentClass.phystr - selectedEnemy.phydef);
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilityFourDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        if (hero.currentClass.mp >= cost) {
            ctx.fillStyle = "Blue";
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

            ctx.fillStyle = "Red";
            if ((hero.currentClass.magstr) > selectedEnemy.magdef) {
                var i = (hero.currentClass.magstr - selectedEnemy.magdef) * (hero.currentClass.magstr - selectedEnemy.magdef);
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            } else {
                ctx.fillText("-" + (hero.currentClass.phystr - selectedEnemy.phydef), selectedEnemy.x - 10, selectedEnemy.y - 5);
            }
        }

    }
}
Psychic.prototype.abilityFive = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Fire") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Fire") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilityFiveDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 1;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Fire") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Fire") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else if (strongToFire) {
            ctx.fillStyle = "Green";
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                    ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Psychic.prototype.abilitySix = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 3;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp - i;
        } else if (strongToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            selectedEnemy.hp = selectedEnemy.hp + i;
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                selectedEnemy.hp = selectedEnemy.hp - i;
            }
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilitySixDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 3;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Water") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Water") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else if (strongToFire) {
            ctx.fillStyle = "Green";
            var i = Math.abs((hero.currentClass.magstr - selectedEnemy.phydef) * 5);
            ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                    var i = (hero.currentClass.magstr - selectedEnemy.phydef);
                    ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
                } else {
                    ctx.fillText("0", selectedEnemy.x - 10, selectedEnemy.y - 5);

                }
            }
        }
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Psychic.prototype.abilitySeven = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 5;
    var weak = false;
    var strong = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Gravity") weak = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Gravity") strong = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weak) {
            selectedEnemy.hp = selectedEnemy.hp - selectedEnemy.hp/2;
        } else if (strong) {
            selectedEnemy.hp = selectedEnemy.hp + selectedEnemy.hp / 2;

        } else {
            var i = selectedEnemy.hp / 4;
            selectedEnemy.hp = selectedEnemy.hp - i;
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilitySevenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 5;
    var weakToFire = false;
    var strongToFire = false;
    for (var i = 0; i < selectedEnemy.weakness.length; i++) {
        if (selectedEnemy.weakness[i] === "Gravity") weakToFire = true;
    }
    for (var i = 0; i < selectedEnemy.strength.length; i++) {
        if (selectedEnemy.strength[i] === "Gravity") strongToFire = true;
    }
    if (hero.currentClass.mp >= cost) {
        if (weakToFire) {
            var i = selectedEnemy.hp / 2;
            ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else if (strongToFire) {
            ctx.fillStyle = "Green";
            var i = selectedEnemy.hp / 2;
            ctx.fillText("+" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
        } else {
            if (hero.currentClass.magstr - selectedEnemy.phydef > 0) {
                var i = selectedEnemy.hp / 4;
                ctx.fillText("-" + i, selectedEnemy.x - 10, selectedEnemy.y - 5);
            }
        }
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Psychic.prototype.abilityEight = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy) {
    var cost = 20;
    if (hero.currentClass.mp >= cost) {
        if (firstEnemy != null) {
            var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 10);
            firstEnemy.hp = firstEnemy.hp - i;
        }
        if (secondEnemy != null) {
            var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 10);
            secondEnemy.hp = secondEnemy.hp - i;
        }
        if (thirdEnemy != null) {
            var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 10);
            thirdEnemy.hp = thirdEnemy.hp - i;
        }
        hero.currentClass.mp -= cost;
    }
}
Psychic.prototype.abilityEightDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
    var cost = 20;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        if (hero.currentClass.mp >= cost) {
            ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
            if (firstEnemy != null) {
                var i = Math.abs((hero.currentClass.magstr - firstEnemy.magdef) * 10);
                ctx.fillText("-" + i, firstEnemy.x - 10, firstEnemy.y - 5);
            }
            if (secondEnemy != null) {
                var i = Math.abs((hero.currentClass.magstr - secondEnemy.magdef) * 10);
                ctx.fillText("-" + i, secondEnemy.x - 10, secondEnemy.y - 5);
            }
            if (thirdEnemy != null) {
                var i = Math.abs((hero.currentClass.magstr - thirdEnemy.magdef) * 10);
                ctx.fillText("-" + i, thirdEnemy.x - 10, thirdEnemy.y - 5);
            }

        }

    }
}
Psychic.prototype.abilityNine = function (hero) {
    if (hero.abilityNineAP === hero.abilityNineAPNeeded) hero.magGuard = true;

}
Psychic.prototype.abilityNineDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {

}
Psychic.prototype.abilityTen = function (hero) {
    if (hero.abilityTenAP === hero.abilityTenAPNeeded) hero.physGuard = true;


}
Psychic.prototype.abilityTenDisplay = function (hero, selectedEnemy, firstEnemy, secondEnemy, thirdEnemy, time, ctx) {
}
Psychic.prototype.draw = function (ctx, x, y, size) {
    this.Danimation.drawFrame(this.game.clockTick, ctx, x, y, size);

}
// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/desert.jpg");
ASSET_MANAGER.queueDownload("./img/desert_battle.jpg");
ASSET_MANAGER.queueDownload("./img/grassland.jpg");
ASSET_MANAGER.queueDownload("./img/snow.jpg");
ASSET_MANAGER.queueDownload("./img/FinalFantasyX_zps39dfae2a.png");
ASSET_MANAGER.queueDownload("./img/hell4.jpg");
ASSET_MANAGER.queueDownload("./img/tree.png");
ASSET_MANAGER.queueDownload("./img/emu.png");
ASSET_MANAGER.queueDownload("./img/ghoul.png");
ASSET_MANAGER.queueDownload("./img/wolfkin.png");

<<<<<<< HEAD
ASSET_MANAGER.queueDownload("./img/dinox.png");
ASSET_MANAGER.queueDownload("./img/lizardman.png");
ASSET_MANAGER.queueDownload("./img/tornadolizard.png");
ASSET_MANAGER.queueDownload("./img/seabird.png");
ASSET_MANAGER.queueDownload("./img/gillman.png");
ASSET_MANAGER.queueDownload("./img/hydra.png");
ASSET_MANAGER.queueDownload("./img/sentinel.png");
ASSET_MANAGER.queueDownload("./img/siren.png");
ASSET_MANAGER.queueDownload("./img/flamedragon.png");
ASSET_MANAGER.queueDownload("./img/bluedragon.png");
ASSET_MANAGER.queueDownload("./img/seadragon.png");
ASSET_MANAGER.queueDownload("./img/chimera.png");

=======
ASSET_MANAGER.queueDownload("./img/battle.png");
>>>>>>> e7d5ff43e376c2604cba468d4bfd8d50a14c89b8
ASSET_MANAGER.queueDownload("./img/DungeonStart.png");
ASSET_MANAGER.queueDownload("./img/DungeonRoom.png");
ASSET_MANAGER.queueDownload("./img/DungeonMap.png");
ASSET_MANAGER.queueDownload("./img/BossMap.png");



ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    //Game Engine
    var gameEngine = new GameEngine();
    //Components
    gameEngine.running = true;
    gameEngine.battleRunning = false;
    gameEngine.menuRunning = false;
    //Trivial difficulty
    var enemy2 = new Ghoul(gameEngine, -1, 0);
    var enemy1 = new Emu(gameEngine, -1, 0);
    var enemy3 = new Wolfkin(gameEngine, -1, 0);
    //Easy difficulty
    var enemy4 = new Dinox(gameEngine, -1, 0);
    var enemy5 = new LizardMan(gameEngine, -1, 0);
    var enemy6 = new TornadoLizard(gameEngine, -1, 0);
    //Medium difficulty
    var enemy7 = new Seabird(gameEngine, -1, 0);
    var enemy8 = new Gillman(gameEngine, -1, 0);
    var enemy9 = new Sentinel(gameEngine, -1, 0);
    var enemy10 = new Siren(gameEngine, -1, 0);
    var enemy11 = new Hydra(gameEngine, -1, 0);
    //Hardest difficulty
    var enemy12 = new FlameDragon(gameEngine, -1, 0);
    var enemy13 = new BlueDragon(gameEngine, -1, 0);
    var enemy14 = new SeaDragon(gameEngine, -1, 0);
    var enemy15 = new Chimera(gameEngine, -1, 0);
    /*var areas = [];
    
    var start = new TileZero(gameEngine, enemy3, enemy2);
    var map = new TileOne(gameEngine);
    var room = new TileTwo(gameEngine);
    var boss = new TileThree(gameEngine);
    areas.push(start);
    gameEngine.addEntity(start);
    areas.push(map);
    gameEngine.addEntity(map);
    areas.push(room);
    gameEngine.addEntity(room);
    areas.push(boss);
    
    
    
    gameEngine.addEntity(boss);
    gameEngine.platforms = areas;*/

    var platforms = [];
    var t0 = new TileZero(gameEngine, enemy3, enemy2);
    
    platforms.push(t0);
    gameEngine.addEntity(t0);
    var t1 = new TileOne(gameEngine);

    platforms.push(t1);
    gameEngine.addEntity(t1);
    var t2 = new TileTwo(gameEngine);
    platforms.push(t2);
    gameEngine.addEntity(t2);
    var t3 = new TileThree(gameEngine);
    platforms.push(t3);
    gameEngine.addEntity(t3);
    var t4 = new TileFour(gameEngine);
    platforms.push(t4);
    gameEngine.addEntity(t4);
    var t5 = new TileFive(gameEngine);
    platforms.push(t5);
    gameEngine.addEntity(t5);
    var t6 = new TileSix(gameEngine);
    platforms.push(t6);
    gameEngine.addEntity(t6);
    var t7 = new TileSeven(gameEngine);
    platforms.push(t7);
    gameEngine.addEntity(t7);
    var t8 = new TileEight(gameEngine);
    platforms.push(t8);
    gameEngine.addEntity(t8);
    gameEngine.platforms = platforms;
   

    var classes = [];
    var gunner = new Gunner(gameEngine);
    classes.push(gunner);
    gameEngine.addEntity(gunner);
    var bMage = new BMage(gameEngine);
    classes.push(bMage);
    gameEngine.addEntity(bMage);
    var wMage = new WMage(gameEngine);
    classes.push(wMage);
    gameEngine.addEntity(wMage);
    var samurai = new Samurai(gameEngine);
    classes.push(samurai);
    gameEngine.addEntity(samurai);
    var warrior = new Warrior(gameEngine);
    classes.push(warrior);
    gameEngine.addEntity(warrior);
    var dKnight = new DKnight(gameEngine);
    classes.push(dKnight);
    gameEngine.addEntity(dKnight);
    var berserker = new Berserker(gameEngine);
    classes.push(berserker);
    gameEngine.addEntity(berserker);
    var psychic = new Psychic(gameEngine);
    classes.push(psychic);
    gameEngine.addEntity(psychic);

    gameEngine.classSystem = classes;

    var hero1 = new Hero(gameEngine, gameEngine.classSystem[0].cen, gameEngine.classSystem[0].col, gameEngine.classSystem[0], gameEngine.platforms[0]);
    var menu = new Menu(gameEngine, 25, 25, hero1);
    var battle = new Battle(gameEngine, 20, 20, hero1);

    //Adding components to Game Engine

    gameEngine.addEntity(hero1);
    gameEngine.addEntity(menu);
    gameEngine.addEntity(battle);

    gameEngine.init(ctx);
    gameEngine.start();

});