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

function Animation(spriteSheet, frameWidth, frameHeight, frameDuration, frames, loop, reverse, rowStart) {
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
    var index = this.reverse ? this.frames - this.currentFrame() - 1 : this.currentFrame();
    var vindex = 0;
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
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.running = null;
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

        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    }

    var that = this;

    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
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
            that.running = false;
        }
        if (String.fromCharCode(e.which) === 'E') {
            that.running = true;
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

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}

BoundingBox.prototype.collide = function (oth) {
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top) return true;
    return false;
}

function PlayGame(game, x, y) {
    Entity.call(this, game, x, y);
}

PlayGame.prototype = new Entity();
PlayGame.prototype.constructor = PlayGame;

PlayGame.prototype.reset = function () {
    this.game.running = false;
}
PlayGame.prototype.update = function () {
    if (this.game.click) this.game.running = true;
}

PlayGame.prototype.draw = function (ctx) {
    if (!this.game.running) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/menu.png"), this.x, this.y, 750, 750);
    }
}

//Game Objects
function TileZero(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    //this.boundingbox = new BoundingBox(x, y, width, height);
    Entity.call(this, game, 20, 20);
}

TileZero.prototype = new Entity();
TileZero.prototype.constructor = TileZero;

TileZero.prototype.update = function () {
    if (!this.game.running) return;
    //this.boundingbox = new BoundingBox(this.x, this.y, this.width, this.height);
    Entity.prototype.update.call(this);
}

TileZero.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}

function TileOne(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileOne.prototype = new Entity();
TileOne.prototype.constructor = TileZero;

TileOne.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileOne.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}

function TileTwo(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileTwo.prototype = new Entity();
TileTwo.prototype.constructor = TileZero;

TileTwo.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileTwo.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}

function TileThree(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileThree.prototype = new Entity();
TileThree.prototype.constructor = TileZero;

TileThree.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileThree.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
}

function TileFour(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileFour.prototype = new Entity();
TileFour.prototype.constructor = TileZero;

TileFour.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileFour.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}

function TileFive(game, hero) {
        this.NorthTile = null;
        this.EastTile = null;
        this.SouthTile = null;
        this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileFive.prototype = new Entity();
TileFive.prototype.constructor = TileZero;

TileFive.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileFive.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}

function TileSix(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileSix.prototype = new Entity();
TileSix.prototype.constructor = TileZero;

TileSix.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileSix.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}

function TileSeven(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    Entity.call(this, game, 20, 20);
}

TileSeven.prototype = new Entity();
TileSeven.prototype.constructor = TileZero;

TileSeven.prototype.update = function () {

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
    Entity.call(this, game, 20, 20);
}

TileEight.prototype = new Entity();
TileEight.prototype.constructor = TileZero;

TileEight.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileEight.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}

function Hero(game, tile) {
    this.Ranimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 2);
    this.Danimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0);
    this.Lanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 1);
    this.Uanimation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 3);
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/GoldenSun.png"), 32, 32.2, .4, 3, true, false, 0);
    this.movingNorth = false;
    this.movingSouth = true;
    this.movingWest = false;
    this.movingEast = false;
    this.CurrentTile = tile;
    Entity.call(this, game, 380, 380);


}

Hero.prototype = new Entity();
Hero.prototype.constructor = Hero;

Hero.prototype.update = function () {
    if (this.game.running) {
        if (this.game.up) {
            this.movingNorth = true;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = false;
        } else if (this.game.left) {
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = true;
            this.movingEast = false;
        } else if (this.game.down) {
            this.movingNorth = false;
            this.movingSouth = true;
            this.movingWest = false;
            this.movingEast = false;
        } else if (this.game.right) {
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = true;
        }
    }
    //console.log("Hero is at(" + this.x + "," + this.y + ")");
    Entity.prototype.update.call(this);
}

Hero.prototype.draw = function (ctx) {
    if (!this.game.running) return;
    if (this.movingSouth && this.game.down) {
            this.game.down = false;
            this.y = this.y + 32.2;

            this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
            this.animation = this.Danimation;
        } else if (this.movingNorth && this.game.up) {
            this.game.up = false;
            this.y = this.y - 32.2;

            this.Uanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
            this.animation = this.Uanimation;
        } else if (this.movingWest && this.game.left) {
            this.game.left = false;
            this.x = this.x - 32.2;

            this.Lanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
            this.animation = this.Lanimation;
        } else if (this.movingEast && this.game.right) {
            this.game.left = false;
            this.x = this.x + 32.2;
            this.Ranimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
            this.animation = this.Ranimation;

        } else {
            this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        }

}
// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/desert.jpg");
ASSET_MANAGER.queueDownload("./img/grassland.jpg");
ASSET_MANAGER.queueDownload("./img/GoldenSun.png");
ASSET_MANAGER.queueDownload("./img/menu.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    //Game Engine
    var gameEngine = new GameEngine();
    //Components
    gameEngine.running = true;

    /*var platforms = [];
    var pf = new TileZero(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileOne(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileTwo(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileThree(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileFour(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileFive(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileSix(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileSeven(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new TileEight(gameEngine);
    gameEngine.addEntity(pf);
    platforms.push(pf);
        gameEngine.platforms = platforms;*/
    var tileZero = new TileZero(gameEngine);
    var tileOne = new TileOne(gameEngine);
    var tileTwo = new TileTwo(gameEngine);
    var tileThree = new TileThree(gameEngine);
    var tileFour = new TileFour(gameEngine);
    var tileFive = new TileFive(gameEngine);
    var tileSix = new TileSix(gameEngine);
    var tileSeven = new TileSeven(gameEngine);
    var tileEight = new TileEight(gameEngine);

    var pg = new PlayGame(gameEngine, 25, 25);
    var hero = new Hero(gameEngine);
    //Adding components to Game Engine
    gameEngine.addEntity(tileZero);

    gameEngine.addEntity(hero);
    gameEngine.addEntity(pg);

    gameEngine.init(ctx);
    gameEngine.start();
});