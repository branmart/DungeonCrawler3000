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
    this.doubleClick = 0;
    this.mouse = null;
    this.wheel = null;
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
        this.doubleClick++;
    }, false);

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
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
function TileZero(game, hero, north, south, east, west) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;

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
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.boundingbox1 = new BoundingBox(20, 20, 360, 50);
    this.boundingbox2 = new BoundingBox(550, 20, 300, 50);
    this.boundingbox3 = new BoundingBox(705, 110, 45, 60);
    this.boundingbox4 = new BoundingBox(415, 625, 100, 100);


    this.NorthTile = this.game.platforms[1];
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;

    //this.NorthTile = null;
    //this.EastTile = this.game.platforms[1];
    //this.SouthTile = this.game.platforms[3];
    //this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileZero.prototype.draw = function (ctx) {

    ctx.drawImage(ASSET_MANAGER.getAsset("./img/DungeonStart.png"), this.x, this.y, 760, 760);
    //ctx.strokeStyle = "red";
    //ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
    //ctx.strokeRect(this.boundingbox1.x, this.boundingbox1.y, this.boundingbox1.width, this.boundingbox1.height);
    //ctx.strokeRect(this.boundingbox2.x, this.boundingbox2.y, this.boundingbox2.width, this.boundingbox2.height);
    //ctx.strokeRect(this.boundingbox3.x, this.boundingbox3.y, this.boundingbox3.width, this.boundingbox3.height);
    //ctx.strokeRect(this.boundingbox4.x, this.boundingbox4.y, this.boundingbox4.width, this.boundingbox4.height);
    //var i;
    //var j;
    //left side
    //for (i = this.boundingbox1.x; i < this.boundingbox1.width; i += this.boundingbox1.width/2) {
    //    for(j = this.boundingbox1.y; j < this.boundingbox1.height; j +=  this.boundingbox1.height/10)
    //        ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"),i, j, this.boundingbox1.width/2, this.boundingbox1.height/10);
    //}
    //var k;
    ////bottom first portion
    //for (k = 0; k < 4; k++) {
    //    ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 120+k*60, 705, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    //}
    ////second portion
    //for (k = 0; k < 5; k++) {
    //    ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 500 + k * 55, 705, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    //}

    ////right corner
    //for (k = 0; k < 5; k++) {
    //    for (j = 0; j < 4; j++)
    //        ctx.drawImage(ASSET_MANAGER.getAsset("./img/tree.png"), 500 + k * 55, 20+j*65, this.boundingbox1.width / 2, this.boundingbox1.height / 10);
    //}


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
    this.boundingbox3 = new BoundingBox(20, 500, 760, 275);

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
    Entity.call(this, game, x, y);

    this.playerhero = hero;
    this.heroOneX = hero.x;
    this.heroOneY = hero.y;
}

Menu.prototype = new Entity();
Menu.prototype.constructor = Menu;

Menu.prototype.reset = function () {
    this.game.menuRunning = false;
}
Menu.prototype.update = function () {
    if (!this.game.menuRunning && !this.game.battleRunning) {
        this.playerhero.x = this.playerhero.currentX;
        this.playerhero.y = this.playerhero.currentY;
        this.playerhero.currentClass.hp = this.playerhero.currentClass.hp;
        this.playerhero.currentClass.mp = this.playerhero.currentClass.mp;

    }
    Entity.prototype.update.call(this);

}

Menu.prototype.draw = function (ctx) {

    if (this.game.menuRunning) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/hell4.jpg"), this.x, this.y, 750, 750);

        ctx.lineWidth = 10;
        ctx.strokeStyle = "white";
        ctx.font = "24pt Impact";
        ctx.fillStyle = "white";

        ctx.strokeRect(25, 25, 400, 150); //character area
        if (this.game.click) {
            if (this.game.click.x > 25 && this.game.click.x < 425 && this.game.click.y > 25 && this.game.click.y < 175) {
                this.playerhero.changeClass();
            }
        }
        ctx.fillText("Display Character", 125, 125);

        //ability boxes
        ctx.fillStyle = "black";
        ctx.strokeRect(25, 175, 400, 300); //main box 
        ctx.strokeRect(25, 175, 190, 100); // 1
        ctx.fillText(this.playerhero.abilityOneDescription, 25, 225);
        ctx.strokeRect(25, 275, 190, 100); // 3
        ctx.fillText(this.playerhero.abilityThreeDescription, 25, 325);
        ctx.strokeRect(25, 375, 190, 100); // 5
        ctx.fillText(this.playerhero.abilityFiveDescription, 25, 425);
        ctx.strokeRect(210, 175, 200, 100); // 2
        ctx.fillText(this.playerhero.abilityTwoDescription, 225, 225);
        ctx.strokeRect(210, 275, 200, 100); // 4
        ctx.fillText(this.playerhero.abilityFourDescription, 225, 325);
        ctx.strokeRect(210, 375, 200, 100); // 6
        ctx.fillText(this.playerhero.abilitySixDescription, 225, 425);


        ctx.strokeRect(25, 475, 400, 300); //stats area

        ctx.fillText("Level: " + this.playerhero.currentClass.level, 225, 525);
        ctx.fillText("Class: " + this.playerhero.currentClass.name, 225, 560);

        ctx.fillText("EXP: " + this.playerhero.currentClass.exp + "/" + this.playerhero.currentClass.expMax, 225, 600);
        ctx.fillText("AP: " + this.playerhero.currentClass.ap, 225, 635);

        ctx.fillText("HP: " + this.playerhero.currentClass.hp + "/" + this.playerhero.currentClass.hpMax, 25, 525);
        ctx.fillText("MP: " + this.playerhero.currentClass.mp + "/" + this.playerhero.currentClass.mpMax, 25, 560);

        ctx.fillText("Strength: " + this.playerhero.currentClass.phystr, 25, 600);
        ctx.fillText("Defense: " + this.playerhero.currentClass.phydef, 25, 635);
        ctx.fillText("Magic: " + this.playerhero.currentClass.magstr, 25, 670);
        ctx.fillText("Magic Defense: " + this.playerhero.currentClass.magdef, 25, 705);

        //list of abilities can learn bassed on class
        ctx.fillText("List of abilities", 430, 90);

        for (var i = 25; i < 750;) {
            ctx.strokeRect(415, i, 365, 75);
            i = i + 75;
        }

        this.playerhero.x = 75;
        this.playerhero.y = 75;
        this.playerhero.draw(ctx);
    }


}

function Battle(game, x, y, one, enemy) {
    this.battleTime = 0;
    this.heroOne = one;
    this.firstEnemy = enemy;
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
Battle.prototype.update = function () {
    if (this.game.fledSuccessfully) {
        this.battleTime = 0;
        this.game.fledSuccessfully = false;
    }
    if (this.battleTime > 30) {
        this.game.battleRunning = true;
    }
    if (this.game.battleRunning) {

        if (this.game.click) {
            var x = this.game.click.x;
            var y = this.game.click.y;
        }
        if (this.game.click && this.game.battleRunning) {

            //ability 1 //temp attack ability
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.heroOne.abilityOne(this.heroOne, this.firstEnemy, this.actionTime);


                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }
                var snd = new Audio("sound/soundeffect6.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
                

            }
            //ability 2 //temp healing ability.
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 698 && this.game.click.y < 775) {
                this.heroOne.abilityTwo(this.heroOne, this.firstEnemy, this.actionTime);
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect7.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;

            }
            //ability 3 //temp run ability
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.heroOne.abilityThree(this.heroOne, this.firstEnemy, this.actionTime);
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect12.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 4 //temp heal enemy
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 698 && this.game.click.y < 775) {
                this.heroOne.abilityFour(this.heroOne, this.firstEnemy, this.actionTime);
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect9.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 5 //temp black magic poison
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.heroOne.abilityFive(this.heroOne, this.firstEnemy, this.actionTime);
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect10.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }
            //ability 6
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 698 && this.game.click.y < 775) {
                this.heroOne.abilitySix(this.heroOne, this.firstEnemy, this.actionTime);
                if (this.heroOne.isPoisoned) {
                    this.heroOne.currentClass.hp -= this.firstEnemy.poisonDamage;
                }
                if (this.firstEnemy.isPoisoned && this.firstEnemy.poisonTime > 0) {
                    this.firstEnemy.hp -= this.heroOne.currentClass.poisonDamage;
                    this.firstEnemy.poisonTime--;

                } else {
                    this.firstEnemy.isPoisoned = false;
                    this.firstEnemy.poisonTime = this.firstEnemy.poisonTimeStart;
                }

                var snd = new Audio("sound/soundeffect11.mp3");
                snd.play();
                //snd.currentTime = 0;

                this.actionTime = 0;
            }

            //enemy phase
            this.firstEnemy.abilityOne(this.heroOne, this.firstEnemy);

            //enemy sound effect
            //var snd = new Audio("sound/soundeffect1.mp3");
            //snd.play();
            //snd.currentTime = 0;

            //end logic
            if (this.heroOne.currentClass.hp <= 0 && this.firstEnemy.hp >= 0) {
                this.game.battleRunning = false;
                this.game.running = false;
            } else if (this.firstEnemy.hp <= 0 && this.heroOne.currentClass.hp >= 0) {
                this.game.battleRunning = false;
                this.battleTime = 0;
                this.heroOne.x = this.heroOne.currentX;
                this.heroOne.y = this.heroOne.currentY;
                this.heroOne.currentClass.exp += this.firstEnemy.exp;
                this.heroOne.currentClass.ap += this.firstEnemy.ap;
                this.heroOne.currentClass.hp = this.heroOne.currentClass.hp;
                this.heroOne.currentClass.mp = this.heroOne.currentClass.mp;

                this.firstEnemy.reset();
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
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert_battle.jpg"), this.x, this.y, 760, 760);
        this.firstEnemy.draw(ctx);
        this.heroOne.x = 50;
        this.heroOne.y = 550;
        this.heroOne.draw(ctx);
        var time = 15;
        ctx.font = "24pt Impact";
        var x = this.clickX;
        var y = this.clickY;
        //ability 1
        if (x > 23 && x < 273 && y > 623 && y < 697) {
            this.heroOne.abilityOneDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
        }
        ctx.save();
        ctx.fillStyle = "blue";

        if (this.game.mouse.x > 23 && this.game.mouse.x < 273 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeStyle = "red";

        ctx.moveTo(137, 623);
        ctx.lineTo(137, 698);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityOneDescription, 137, 675);
        ctx.restore();
        ctx.strokeRect(23, 623, 251, 75);
        //TODO fix sound effect 1
        //var snd = new Audio("sounds/soundeffects1.mp3");
        //snd.play();
        //snd.currentTime = 0;

        //ability 2
        if (x > 23 && x < 273 && y > 698 && y < 775) {
            this.heroOne.abilityTwoDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 23 && this.game.mouse.x < 273 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(23, 623 + 75, 251, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityTwoDescription, 100, 750);

        //TODO fix sound effect 2

        //ability 3
        if (x > 274 && x < 527 && y > 623 && y < 697) {
            this.heroOne.abilityThreeDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(274, 623, 252, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityThreeDescription, 360, 675);

        //TODO fix sound effect 3

        //ability 4
        if (x > 274 && x < 527 && y > 698 && y < 775) {
            this.heroOne.abilityFourDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(274, 623 + 75, 252, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityFourDescription, 360, 750);

        //TODO fix sound effect 4

        //ability 5
        if (x > 528 && x < 780 && y > 623 && y < 697) {
            this.heroOne.abilityFiveDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
        }
        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 528 && this.game.mouse.x < 780 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(528, 623, 251, 75);
        ctx.textAlign = "center";
        ctx.fillText(this.heroOne.abilityFiveDescription, 600, 675);

        //TODO fix sound effect 5

        //ability 6
        if (x > 528 && x < 780 && y > 698 && y < 775) {
            this.heroOne.abilitySixDisplay(this.heroOne, this.firstEnemy, this.actionTime, ctx);
            this.firstEnemy.ability1Display(this.heroOne, this.firstEnemy, this.actionTime, ctx);
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
            ctx.fillText("-" + this.firstEnemy.poisonDamage, hero.x - 10, hero.y + 5);
        }
        if (this.firstEnemy.isPoisoned && this.actionTime < 0.75) {
            ctx.fillStyle = "Green";
            ctx.fillText("-" + this.heroOne.currentClass.poisonDamage, this.firstEnemy.x - 10, this.firstEnemy.y + 24);
        }

        if (this.heroOne.currentClass.hp > 0) {
            if (this.game.mouse) {
                if (this.game.mouse.x > this.heroOne.x && this.game.mouse.x < this.heroOne.x + 50 && this.game.mouse.y > this.heroOne.y && this.game.mouse.y < this.heroOne.y + 50) {
                    ctx.fillText("HP: " + this.heroOne.currentClass.hp + "/" + this.heroOne.currentClass.hpMax, 50, 50);
                    ctx.fillText("MP: " + this.heroOne.currentClass.mp + "/" + this.heroOne.currentClass.mpMax, 50, 100);

                }
            }
        } else {

            ctx.fillText("Game Over Man!", 380, 380);
        }
        ctx.fillStyle = "red";
        if (this.game.mouse) {
            if (this.game.mouse.x > this.firstEnemy.x && this.game.mouse.x < this.firstEnemy.x + 50 && this.game.mouse.y > this.firstEnemy.y && this.game.mouse.y < this.firstEnemy.y + 50) {
                ctx.fillText(this.firstEnemy.hp, 50, 50);

            }
        }

    }
}

function EnemyType1(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 56;
    this.mp = 0;
    this.phystr = 17;
    this.phydef = 5;
    this.magstr = 1;
    this.magdef = 0;
    this.exp = 1;
    this.ap = 1;
    this.isPoisoned = false;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 2, center, column);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, center, column);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 1, center, column);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 3, center, column);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, center, column);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.boxes = true;
    this.x = 380;
    this.y = 380;
    this.currentClass = "Warrior";

    Entity.call(this, game, 700, 50);

}
EnemyType1.prototype = new Entity();
EnemyType1.prototype.constructor = EnemyType1;

EnemyType1.prototype.update = function () {

    Entity.prototype.update.call(this);
}
EnemyType1.prototype.reset = function () {
    this.hp = 56;
    this.mp = 0;
    this.poisonTime = 3;
    this.poisonTimeStart = 3;
    this.isPoisoned = false;

    Entity.prototype.update.call(this);
}
EnemyType1.prototype.abilityOne = function (hero, enemy) {
    if ((enemy.phystr - hero.currentClass.phydef) > 0) {
        hero.currentClass.hp = hero.currentClass.hp - (enemy.phystr - hero.currentClass.phydef);
    }
}
EnemyType1.prototype.ability1Display = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.save();
        ctx.fillStyle = "Red"
        if ((enemy.phystr - hero.currentClass.phydef) > 0) {
            ctx.fillText("-" + (enemy.phystr - hero.currentClass.phydef), hero.x - 10, hero.y + 5);

        } else {
            ctx.fillText(0, hero.x - 10, hero.y + 5);

        }
        ctx.restore();
    }
}
EnemyType1.prototype.draw = function (ctx) {
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
}
function Hero(game, cen, col, job, tile) {
    this.cen = cen;
    this.col = col;
    this.isPoisoned = false;
    this.abilityOneDescription = job.abilityOneDescription;
    this.abilityTwoDescription = job.abilityTwoDescription;
    this.abilityThreeDescription = job.abilityThreeDescription;
    this.abilityFourDescription = job.abilityFourDescription;
    this.abilityFiveDescription = job.abilityFiveDescription;
    this.abilitySixDescription = job.abilitySixDescription;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 2, this.cen, this.col);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 1, this.cen, this.col);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 3, this.cen, this.col);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
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
Hero.prototype.changeClass = function () {
    this.currentClass = this.game.classSystem[1];
    this.abilityOneDescription = this.currentClass.abilityOneDescription;
    this.abilityTwoDescription = this.currentClass.abilityTwoDescription;
    this.abilityThreeDescription = this.currentClass.abilityThreeDescription;
    this.abilityFourDescription = this.currentClass.abilityFourDescription;
    this.abilityFiveDescription = this.currentClass.abilityFiveDescription;
    this.abilitySixDescription = this.currentClass.abilitySixDescription;
    this.cen = this.currentClass.cen;
    this.col = this.currentClass.col;
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 2, this.cen, this.col);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 1, this.cen, this.col);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 3, this.cen, this.col);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0, this.cen, this.col);
}
Hero.prototype.abilityOne = function (hero, enemy, time) {
    this.currentClass.abilityOne(hero, enemy, time);
}
Hero.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilityOneDisplay(hero, enemy, time, ctx);

}
Hero.prototype.abilityTwo = function (hero, enemy, time) {
    this.currentClass.abilityTwo(hero, enemy, time);
}

Hero.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilityTwoDisplay(hero, enemy, time, ctx);

}
Hero.prototype.abilityThree = function (hero, enemy, time) {
    this.currentClass.abilityThree(hero, enemy, time);
}
Hero.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilityThreeDisplay(hero, enemy, time, ctx);

}
Hero.prototype.abilityFour = function (hero, enemy, time) {
    this.currentClass.abilityFour(hero, enemy, time);
}
Hero.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilityFourDisplay(hero, enemy, time, ctx);

}
Hero.prototype.abilityFive = function (hero, enemy, time) {
    this.currentClass.abilityFive(hero, enemy, time);
}
Hero.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilityFiveDisplay(hero, enemy, time, ctx);

}
Hero.prototype.abilitySix = function (hero, enemy, time) {
    this.currentClass.abilitySix(hero, enemy, time);
}
Hero.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    this.currentClass.abilitySixDisplay(hero, enemy, time, ctx);

}
Hero.prototype.draw = function (ctx) {
    if (this.game.menuRunning) {
        this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
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
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Danimation;
    } else if (this.movingNorth && this.game.up) {
        this.game.up = false;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Uanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Uanimation;
    } else if (this.movingWest && this.game.left) {
        this.game.left = false;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Lanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Lanimation;
    } else if (this.movingEast && this.game.right) {
        this.game.left = false;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Ranimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Ranimation;

    } else {
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
    }
    ctx.beginPath();
    ctx.arc(this.circle1.x, this.circle1.y, this.circle1.radius, 0 * Math.PI, 2 * Math.PI);
    ctx.stroke();
}
function Warrior(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 100;
    this.hpMax = 100;
    this.hpRegen = 3;
    this.mp = 26;
    this.mpMax = 26;
    this.mpRegen = 2;
    this.phystr = 10;
    this.phydef = 10;
    this.magstr = 2;
    this.magdef = 3;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Warrior";
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Cleave";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Shield Bash";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Whirlwind";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Poison";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Warrior.prototype = new Entity();
Warrior.prototype.constructor = Warrior;
Warrior.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.phystr += 2;
        this.phydef += 1;
        this.magdef += .10;
        this.mpMax += 2;
        this.mp = this.mpMax;
        this.magstr += .50;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Warrior.prototype.abilityOne = function (hero, enemy, time) {
    if ((this.phystr - enemy.phydef) > 0) {
        enemy.hp = enemy.hp - (this.phystr - enemy.phydef);
    }
}
Warrior.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((this.phystr - enemy.phydef) > 0) {
            ctx.fillText("-" + (this.phystr - enemy.phydef), enemy.x - 10, enemy.y - 5);
        } else {
            ctx.fillText("-" + 0, enemy.x - 10, enemy.y - 5);

        }
    }
}
Warrior.prototype.abilityTwo = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr;
        this.mp -= cost;
    }
}
Warrior.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Warrior.prototype.abilityThree = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phydef;
        this.mp -= cost;
    }
}
Warrior.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phydef, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Warrior.prototype.abilityFour = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr * 3;
        this.mp -= cost;
    }
}
Warrior.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr * 3, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

    }
}
Warrior.prototype.abilityFive = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (this.mp >= cost) {
        enemy.hp -= enemy.phydef + enemy.magdef;
        this.mp -= cost;
    }
}
Warrior.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        var damage = enemy.phydef + enemy.magdef;
        ctx.fillStyle = "Red";
        ctx.fillText("-" + damage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Warrior.prototype.abilitySix = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.poisonDamage;
        enemy.isPoisoned = true;
        this.mp -= cost;
    }
}
Warrior.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        ctx.fillText("-" + this.poisonDamage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Warrior.prototype.draw = function (ctx) {
}
function Rogue(game) {
    this.level = 1;
    this.cen = 2;
    this.col = 0;
    this.hp = 75;
    this.hpMax = 75;
    this.hpRegen = 5;
    this.mp = 30;
    this.mpMax = 30;
    this.mpRegen = 7;
    this.phystr = 10;
    this.phydef = 8;
    this.magstr = 7;
    this.magdef = 4;
    this.poisonTime = 0;
    this.poisonDamage = 7;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Rogue";
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Stab";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Flee";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Invisibility";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Bomb";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Zombie Dart";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Rogue.prototype = new Entity();
Rogue.prototype.constructor = Rogue;
Rogue.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 5;
        this.hp = this.hpMax;
        this.phystr += 2;
        this.phydef += 1;
        this.magdef += .10;
        this.mpMax += 2;
        this.mp = this.mpMax;
        this.magstr += .50;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

function BattleMage(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 60;
    this.hpMax = 60;
    this.hpRegen = 2;
    this.mp = 100;
    this.mpMax = 100;
    this.mpRegen = 4;
    this.phystr = 2;
    this.phydef = 4;
    this.magstr = 10;
    this.magdef = 10;
    this.poisonTime = 1;
    this.poisonDamage = 3;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Battle Mage";
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Fireball";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Forcefield Push";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Storm of Swords";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Poison";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
BattleMage.prototype = new Entity();
BattleMage.prototype.constructor = BattleMage;
BattleMage.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 2;
        this.hp = this.hpMax;
        this.phystr += .5;
        this.phydef += .1;
        this.magdef += 1;
        this.mpMax += 5;
        this.mp = this.mpMax;
        this.magstr += 2;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

BattleMage.prototype.abilityOne = function (hero, enemy, time) {
    if ((this.phystr - enemy.phydef) > 0) {
        enemy.hp = enemy.hp - (this.phystr - enemy.phydef);
    }
}
BattleMage.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((this.phystr - enemy.phydef) > 0) {
            ctx.fillText("-" + (this.phystr - enemy.phydef), enemy.x - 10, enemy.y - 5);
        } else {
            ctx.fillText("-" + 0, enemy.x - 10, enemy.y - 5);

        }
    }
}
BattleMage.prototype.abilityTwo = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magstr;
        this.mp -= cost;
    }
}
BattleMage.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magstr, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
BattleMage.prototype.abilityThree = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magdef;
        this.mp -= cost;
    }
}
BattleMage.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magdef, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
BattleMage.prototype.abilityFour = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magstr * 3;
        this.mp -= cost;
    }
}
BattleMage.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magstr * 3, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

    }
}
BattleMage.prototype.abilityFive = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (this.mp >= cost) {
        enemy.hp -= enemy.phydef + enemy.magdef;
        this.mp -= cost;
    }
}
BattleMage.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        var damage = enemy.phydef + enemy.magdef;
        ctx.fillStyle = "Red";
        ctx.fillText("-" + damage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
BattleMage.prototype.abilitySix = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.poisonDamage;
        enemy.isPoisoned = true;
        this.mp -= cost;
    }
}
BattleMage.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        ctx.fillText("-" + this.poisonDamage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
BattleMage.prototype.draw = function (ctx) {
}

function Ranger(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 70;
    this.hpMax = 70;
    this.hpRegen = 2;
    this.mp = 100;
    this.mpMax = 100;
    this.mpRegen = 4;
    this.phystr = 6;
    this.phydef = 5;
    this.magstr = 3;
    this.magdef = 5;
    this.poisonTime = 1;
    this.poisonDamage = 4;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Ranger";
    this.abilityOneDescription = "Attack";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Arrow";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Kingsfoil Field Dressing";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Flame of the North";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Poison";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Ranger.prototype = new Entity();
Ranger.prototype.constructor = Ranger;
Ranger.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 2;
        this.hp = this.hpMax;
        this.phystr += .5;
        this.phydef += .1;
        this.magdef += 1;
        this.mpMax += 5;
        this.mp = this.mpMax;
        this.magstr += 2;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Ranger.prototype.abilityOne = function (hero, enemy, time) {
    if ((this.phystr - enemy.phydef) > 0) {
        enemy.hp = enemy.hp - (this.phystr - enemy.phydef);
    }
}
Ranger.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((this.phystr - enemy.phydef) > 0) {
            ctx.fillText("-" + (this.phystr - enemy.phydef), enemy.x - 10, enemy.y - 5);
        } else {
            ctx.fillText("-" + 0, enemy.x - 10, enemy.y - 5);

        }
    }
}
Ranger.prototype.abilityTwo = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr;
        this.mp -= cost;
    }
}
Ranger.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Ranger.prototype.abilityThree = function (hero, enemy, time, ctx) {
    var cost = 2;
    if (this.mp >= cost) {
        this.hp += this.magstr;
        if (this.hp > this.hpMax) {
            this.hp = this.hpMax;
        }
        this.mp -= cost;
    }
}
Ranger.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;

    if (time < 0.75) {
        ctx.fillStyle = "Green";
        ctx.fillText("+" + this.magstr, hero.x + 50, hero.y + 50);
    }
}
Ranger.prototype.abilityFour = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr * 3;
        this.mp -= cost;
    }
}
Ranger.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr * 3, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

    }
}
Ranger.prototype.abilityFive = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (this.mp >= cost) {
        enemy.hp -= enemy.phydef + enemy.magdef;
        this.mp -= cost;
    }
}
Ranger.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        var damage = enemy.phydef + enemy.magdef;
        ctx.fillStyle = "Red";
        ctx.fillText("-" + damage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Ranger.prototype.abilitySix = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.poisonDamage;
        enemy.isPoisoned = true;
        this.mp -= cost;
    }
}
Ranger.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        ctx.fillText("-" + this.poisonDamage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Ranger.prototype.draw = function (ctx) {
}

function Fedaykin(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 60;
    this.hpMax = 50;
    this.hpRegen = 2;
    this.mp = 100;
    this.mpMax = 100;
    this.mpRegen = 2;
    this.phystr = 14;
    this.phydef = 8;
    this.magstr = 2;
    this.magdef = 2;
    this.poisonTime = 3;
    this.poisonDamage = 6;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Fedaykin";
    this.abilityOneDescription = "Crysknife";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Maula Pistol";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Shield Belt Overload";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Whirlwind";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Gom Jabbar";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Fedaykin.prototype = new Entity();
Fedaykin.prototype.constructor = Fedaykin;
Fedaykin.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 2;
        this.hp = this.hpMax;
        this.phystr += .5;
        this.phydef += .1;
        this.magdef += 1;
        this.mpMax += 5;
        this.mp = this.mpMax;
        this.magstr += 2;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Fedaykin.prototype.abilityOne = function (hero, enemy, time) {
    if ((this.phystr - enemy.phydef) > 0) {
        enemy.hp = enemy.hp - (this.phystr - enemy.phydef);
    }
}
Fedaykin.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((this.phystr - enemy.phydef) > 0) {
            ctx.fillText("-" + (this.phystr - enemy.phydef), enemy.x - 10, enemy.y - 5);
        } else {
            ctx.fillText("-" + 0, enemy.x - 10, enemy.y - 5);

        }
    }
}
Fedaykin.prototype.abilityTwo = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr;
        this.mp -= cost;
    }
}
Fedaykin.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Fedaykin.prototype.abilityThree = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phydef;
        this.hp = this.hp - (this.phydef / 2);
        this.mp -= cost;
    }
}
Fedaykin.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phydef, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Fedaykin.prototype.abilityFour = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.phystr * 3;
        this.mp -= cost;
    }
}
Fedaykin.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.phystr * 3, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

    }
}
Fedaykin.prototype.abilityFive = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (this.mp >= cost) {
        enemy.hp -= enemy.phydef + enemy.magdef;
        this.mp -= cost;
    }
}
Fedaykin.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        var damage = enemy.phydef + enemy.magdef;
        ctx.fillStyle = "Red";
        ctx.fillText("-" + damage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Fedaykin.prototype.abilitySix = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.poisonDamage;
        enemy.isPoisoned = true;
        this.mp -= cost;
    }
}
Fedaykin.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        ctx.fillText("-" + this.poisonDamage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Fedaykin.prototype.draw = function (ctx) {
}

function Necromancer(game) {
    this.level = 1;
    this.cen = -1;
    this.col = 0;
    this.hp = 50;
    this.hpMax = 50;
    this.hpRegen = 3;
    this.mp = 150;
    this.mpMax = 150;
    this.mpRegen = 4;
    this.phystr = 2;
    this.phydef = 4;
    this.magstr = 8;
    this.magdef = 10;
    this.poisonTime = 2;
    this.poisonDamage = 1;
    this.ap = 0;
    this.exp = 0;
    this.expMax = 10;
    this.name = "Necromancer";
    this.abilityOneDescription = "Shovel";
    this.abilityOneAP = 0;
    this.abilityOneAPNeeded = 0;

    this.abilityTwoDescription = "Fireball";
    this.abilityTwoAP = 0;
    this.abilityTwoAPNeeded = 0;

    this.abilityThreeDescription = "Forcefield Push";
    this.abilityThreeAP = 0;
    this.abilityThreeAPNeeded = 0;

    this.abilityFourDescription = "Army of Darkness";
    this.abilityFourAP = 0;
    this.abilityFourAPNeeded = 0;

    this.abilityFiveDescription = "Table-turner";
    this.abilityFiveAP = 0;
    this.abilityFiveAPNeeded = 0;

    this.abilitySixDescription = "Poison";
    this.abilitySixAP = 0;
    this.abilitySixAPNeeded = 0;

    this.abilitySevenDescription = "Cleave";
    this.abilitySevenAP = 0;
    this.abilitySevenAPNeeded = 100;

    this.abilityEightDescription = "Cleave";
    this.abilityEightAP = 0;
    this.abilityEightAPNeeded = 100;

    this.abilityNineDescription = "Cleave";
    this.abilityNineAP = 0;
    this.abilityNineAPNeeded = 100;

    this.abilityTenDescription = "Cleave";
    this.abilityTenAP = 0;
    this.abilityTenAPNeeded = 100;
    Entity.call(this, game, 380, 380);
}
Necromancer.prototype = new Entity();
Necromancer.prototype.constructor = Necromancer;
Necromancer.prototype.update = function () {
    if (this.exp >= this.expMax) {
        this.hpMax += 2;
        this.hp = this.hpMax;
        this.phystr += .5;
        this.phydef += .1;
        this.magdef += 1;
        this.mpMax += 5;
        this.mp = this.mpMax;
        this.magstr += 2;
        this.level += 1;
        this.exp -= this.expMax;
    }
    Entity.prototype.update.call(this);
}

Necromancer.prototype.abilityOne = function (hero, enemy, time) {
    if ((this.phystr - enemy.phydef) > 0) {
        enemy.hp = enemy.hp - (this.phystr - enemy.phydef);
    }
}
Necromancer.prototype.abilityOneDisplay = function (hero, enemy, time, ctx) {
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        if ((this.phystr - enemy.phydef) > 0) {
            ctx.fillText("-" + (this.phystr - enemy.phydef), enemy.x - 10, enemy.y - 5);
        } else {
            ctx.fillText("-" + 0, enemy.x - 10, enemy.y - 5);

        }
    }
}
Necromancer.prototype.abilityTwo = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magstr;
        this.mp -= cost;
    }
}
Necromancer.prototype.abilityTwoDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magstr, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Necromancer.prototype.abilityThree = function (hero, enemy, time, ctx) {
    var cost = 1;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magdef;
        this.mp -= cost;
    }
}
Necromancer.prototype.abilityThreeDisplay = function (hero, enemy, time, ctx) {
    var cost = 1;

    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magdef, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Necromancer.prototype.abilityFour = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.magstr * 3;
        this.mp -= cost;
    }
}
Necromancer.prototype.abilityFourDisplay = function (hero, enemy, time, ctx) {
    var cost = 3;
    if (time < 0.75) {
        ctx.fillStyle = "Red"
        ctx.fillText("-" + this.magstr * 3, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);

    }
}
Necromancer.prototype.abilityFive = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (this.mp >= cost) {
        enemy.hp -= enemy.phydef + enemy.magdef;
        this.mp -= cost;
    }
}
Necromancer.prototype.abilityFiveDisplay = function (hero, enemy, time, ctx) {
    var cost = 5;
    if (time < 0.75) {
        var damage = enemy.phydef + enemy.magdef;
        ctx.fillStyle = "Red";
        ctx.fillText("-" + damage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Necromancer.prototype.abilitySix = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (this.mp >= cost) {
        enemy.hp = enemy.hp - this.poisonDamage;
        enemy.isPoisoned = true;
        this.mp -= cost;
    }
}
Necromancer.prototype.abilitySixDisplay = function (hero, enemy, time, ctx) {
    var cost = 4;
    if (time < 0.75) {
        ctx.fillStyle = "Red";
        ctx.fillText("-" + this.poisonDamage, enemy.x - 10, enemy.y - 5);
        ctx.fillStyle = "Blue";
        ctx.fillText("-" + cost, hero.x + 50, hero.y + 50);
    }
}
Necromancer.prototype.draw = function (ctx) {
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/desert.jpg");
ASSET_MANAGER.queueDownload("./img/desert_battle.jpg");
ASSET_MANAGER.queueDownload("./img/grassland.jpg");
ASSET_MANAGER.queueDownload("./img/snow.jpg");
ASSET_MANAGER.queueDownload("./img/GoldenSun.png");
ASSET_MANAGER.queueDownload("./img/hell4.jpg");
ASSET_MANAGER.queueDownload("./img/tree.png");
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

    
    var areas = [];
    
    var start = new TileZero(gameEngine);
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
    gameEngine.platforms = areas;

    //var platforms = [];
    //var t0 = new TileZero(gameEngine);
    
    //platforms.push(t0);
    //gameEngine.addEntity(t0);
    //var t1 = new TileOne(gameEngine);

    //platforms.push(t1);
    //gameEngine.addEntity(t1);
    //var t2 = new TileTwo(gameEngine);
    //platforms.push(t2);
    //gameEngine.addEntity(t2);
    //var t3 = new TileThree(gameEngine);
    //platforms.push(t3);
    //gameEngine.addEntity(t3);
    //var t4 = new TileFour(gameEngine);
    //platforms.push(t4);
    //gameEngine.addEntity(t4);
    //var t5 = new TileFive(gameEngine);
    //platforms.push(t5);
    //gameEngine.addEntity(t5);
    //var t6 = new TileSix(gameEngine);
    //platforms.push(t6);
    //gameEngine.addEntity(t6);
    //var t7 = new TileSeven(gameEngine);
    //platforms.push(t7);
    //gameEngine.addEntity(t7);
    //var t8 = new TileEight(gameEngine);
    //platforms.push(t8);
    //gameEngine.addEntity(t8);
    //gameEngine.platforms = platforms;
   

    var classes = [];
    var warrior = new Warrior(gameEngine);
    classes.push(warrior);
    var rogue = new Rogue(gameEngine);
    classes.push(rogue);
    var battleMage = new BattleMage(gameEngine);
    classes.push(battleMage);
    var ranger = new Ranger(gameEngine);
    classes.push(ranger);
    var fedaykin = new Fedaykin(gameEngine);
    classes.push(fedaykin);
    var necromancer = new Necromancer(gameEngine);
    classes.push(necromancer);

    gameEngine.classSystem = classes;

    var hero1 = new Hero(gameEngine, gameEngine.classSystem[4].cen, gameEngine.classSystem[4].col, gameEngine.classSystem[4], gameEngine.platforms[0]);

    var enemy1 = new EnemyType1(gameEngine, 2, 4);
    gameEngine.firstEnemy = enemy1;
    var menu = new Menu(gameEngine, 25, 25, hero1);
    var battle = new Battle(gameEngine, 20, 20, hero1, gameEngine.firstEnemy);

    //Adding components to Game Engine

    gameEngine.addEntity(hero1);
    gameEngine.addEntity(menu);
    gameEngine.addEntity(battle);

    gameEngine.init(ctx);
    gameEngine.start();
});