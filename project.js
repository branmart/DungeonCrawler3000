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
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.running = null;
    this.battleRunning = null;
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
                that.running = false;
            }
        }
        if (String.fromCharCode(e.which) === 'E') {
            if (!that.battleRunning) {
                that.running = true;
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

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}
BoundingBox.prototype.collideLeft = function (oth) {
    if (this.left-10 > oth.left) return true;
    return false;
}
BoundingBox.prototype.collideTop = function (oth) {
    if (this.top - 10 > oth.top) return true;
    return false;
}
BoundingBox.prototype.collideRight = function (oth) {
    if (this.right+25.90 < oth.right) return true;
    return false;
}
BoundingBox.prototype.collideBottom = function (oth) {
    if (this.bottom + 20 < oth.bottom) return true;
    return false;
}

function Menu(game, x, y) {
    Entity.call(this, game, x, y);

    this.playerhero = this.game.hero;
    this.playerheroX = 250;
    this.playerheroY = 250;
}

Menu.prototype = new Entity();
Menu.prototype.constructor = Menu;

Menu.prototype.reset = function () {
    this.game.running = false;
}
Menu.prototype.update = function () {
    //if (this.game.click) this.game.running = true;
}

Menu.prototype.draw = function (ctx) {
    
    if (!this.game.running) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/hell4.jpg"), this.x, this.y, 750, 750);

        ctx.lineWidth = 10;
        ctx.strokeStyle = "white";
        ctx.font = "24pt Impact";
        ctx.fillStyle = "white";
        
        ctx.strokeRect(25, 25, 400, 150); //character area

        ctx.fillText("Display Character", 125, 125);

        //ability boxes
        ctx.strokeRect(25, 175, 400, 300); //main box 
        ctx.strokeRect(25, 175, 190, 100); // 1
        ctx.fillText("Ability 1", 25, 225);
        ctx.strokeRect(25, 275, 190, 100); // 3
        ctx.fillText("Ability 3", 25, 325);
        ctx.strokeRect(25, 375, 190, 100); // 5
        ctx.fillText("Ability 5", 25, 425);
        ctx.strokeRect(210, 175, 200, 100); // 2
        ctx.fillText("Ability 2", 225, 225);
        ctx.strokeRect(210, 275, 200, 100); // 4
        ctx.fillText("Ability 4", 225, 325);
        ctx.strokeRect(210, 375, 200, 100); // 6
        ctx.fillText("Ability 6", 225, 425);


        ctx.strokeRect(25, 475, 400, 300); //stats area

        ctx.fillText("Level: ", 225, 525);
        ctx.fillText("Class: ", 225, 560);

        ctx.fillText("HP: ", 25, 525);
        ctx.fillText("MP: ", 25, 560);

        ctx.fillText("Strength:", 25, 600);
        ctx.fillText("Defense:", 25, 635);
        ctx.fillText("Magic:", 25, 670);
        ctx.fillText("Magic Defense:", 25, 705);

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

function Battle(game, x, y,one, enemy) {
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
    Entity.call(this, game, x, y);
}

Battle.prototype = new Entity();
Battle.prototype.constructor = Battle;

Battle.prototype.reset = function () {
    this.game.battleRunning = false;
}
Battle.prototype.update = function () {
    if (this.battleTime > 10) {
        this.game.battleRunning = true;
    }
    if (this.game.running) {
        this.heroOneX = this.game.hero.currentX;
        this.heroOneY = this.game.hero.currentY;
        if (this.game.click) {
            var x = this.game.click.x;
            var y = this.game.click.y;
        }
        if (this.game.mouse) {
            console.log("(" + this.game.mouse.x + ", " + this.game.mouse.y + ")")
        }
        if (this.game.click && this.game.battleRunning) {
            console.log("(" + this.game.click.x + ", " + this.game.click.y + ")");
            //ability 1 //temp attack ability
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.firstEnemy.hp = this.firstEnemy.hp - (this.heroOne.phystr - this.firstEnemy.phydef);
            }
            //ability 2 //temp healing ability.
            if (this.game.click.x > 23 && this.game.click.x < 273 && this.game.click.y > 698 && this.game.click.y < 775) {

                if (this.heroOne.hp < 100) {
                    this.heroOne.hp = this.heroOne.hp + 10;
                    if (this.heroOne.hp > 100) this.heroOne.hp = 100;
                }
            }
            //ability 3 //temp run ability
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.game.battleRunning = false;
                this.battleTime = 0;
                this.heroOne.x = this.heroOneX;
                this.heroOne.y = this.heroOneY;
                this.firstEnemy.reset();

            }
            //ability 4 //temp heal enemy
            if (this.game.click.x > 274 && this.game.click.x < 527 && this.game.click.y > 698 && this.game.click.y < 775) {
                this.firstEnemy.hp = this.firstEnemy.hp + 1;

            }
            //ability 5 //temp black magic poison
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 623 && this.game.click.y < 697) {
                this.firstEnemy.hp = this.firstEnemy.hp - (this.heroOne.magstr - this.firstEnemy.magdef);
                this.heroOne.mp -= 1;

            }
            //ability 6 temp kill all
            if (this.game.click.x > 528 && this.game.click.x < 780 && this.game.click.y > 698 && this.game.click.y < 775) {
                this.heroOne.hp = this.heroOne.hp - this.heroOne.hp;
                this.firstEnemy.hp = this.firstEnemy.hp - this.firstEnemy.hp;

            }
            if (this.heroOne.hp <= 0 && this.firstEnemy.hp >= 0) {
                this.game.battleRunning = false;
                this.game.running = false;
            } else if (this.firstEnemy.hp <= 0 && this.heroOne.hp >= 0) {
                this.game.battleRunning = false;
                this.battleTime = 0;
                this.heroOne.x = this.heroOneX;
                this.heroOne.y = this.heroOneY;
                this.heroOne.exp += this.firstEnemy.exp;
                this.heroOne.ap += this.firstEnemy.ap;

                this.firstEnemy.reset();
            } else if (this.heroOne.hp <= 0 && this.firstEnemy.hp <= 0) {
                this.game.battleRunning = false;
                this.game.running = false;
            }
            if ((this.firstEnemy.phystr - this.heroOne.phydef) > 0) {
                this.heroOne.hp = this.heroOne.hp - (this.firstEnemy.phystr - this.heroOne.phydef);
            }
        }
        this.battleTime += this.game.clockTick;
    }
}

Battle.prototype.draw = function (ctx) {


    //console.log(this.heroOne.currentClass);
    if (this.game.battleRunning) {
        ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert_battle.jpg"), this.x, this.y, 760, 760);
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 10; j++) {
                if (this.grid) {
                    ctx.strokeStyle = "green";
                    //ctx.strokeRect(23.5 + i * 252.5, 23.5 + j * 75, 251, 75);
                }
            }
        }
        this.firstEnemy.draw(ctx);
        this.heroOne.x = 50;
        this.heroOne.y = 550;
        this.heroOne.draw(ctx);
        ctx.font = "24pt Impact";

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 23 && this.game.mouse.x < 273 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(23, 623, 251, 75);
        ctx.fillText("Attack", 100, 675);

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 23 && this.game.mouse.x < 273 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(23, 623 + 75, 251, 75);
        ctx.fillText("Heal", 100, 750);

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(274, 623, 252, 75);
        ctx.fillText("Flee", 360, 675);

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 274 && this.game.mouse.x < 527 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
         ctx.strokeRect(274, 623 + 75, 252, 75);
        ctx.fillText("Heal Enemy", 360, 750);

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 528 && this.game.mouse.x < 780 && this.game.mouse.y > 623 && this.game.mouse.y < 697) { ctx.fillStyle = "red"; }
        ctx.strokeRect(528, 623, 251, 75);
        ctx.fillText("Poison", 600, 675);

        ctx.fillStyle = "blue";
        if (this.game.mouse.x > 528 && this.game.mouse.x < 780 && this.game.mouse.y > 698 && this.game.mouse.y < 775) { ctx.fillStyle = "red"; }
        ctx.strokeRect(528, 623+75, 251, 75);
        ctx.fillText("!!!!Obilivion!!!!", 575, 750);

        ctx.fillStyle = "purple";

        if (this.heroOne.hp > 0) {
            if (this.game.mouse) {
                if (this.game.mouse.x > this.heroOne.x && this.game.mouse.x < this.heroOne.x + 50 && this.game.mouse.y > this.heroOne.y && this.game.mouse.y < this.heroOne.y + 50) {
                    ctx.fillText("HP: "+this.heroOne.hp, 50, 50);
                    ctx.fillText("MP: "+this.heroOne.mp, 50, 100);

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
//Game Objects
function TileZero(game, hero) {
    this.NorthTile = null;
    this.EastTile = null;
    this.SouthTile = null;
    this.WestTile = null;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    Entity.call(this, game, 20, 20);
}

TileZero.prototype = new Entity();
TileZero.prototype.constructor = TileZero;

TileZero.prototype.update = function () {
    if (!this.game.running || this.game.battleRunning) return;
    this.boundingbox = new BoundingBox(20, 20, 760, 760);
    this.NorthTile = null;
    this.EastTile = this.game.platforms[1];
    this.SouthTile = this.game.platforms[3];
    this.WestTile = null;
    Entity.prototype.update.call(this);
}

TileZero.prototype.draw = function (ctx) {

    ctx.drawImage(ASSET_MANAGER.getAsset("./img/grassland.jpg"), this.x, this.y, 760, 760);
    ctx.strokeStyle = "red";
    ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
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
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/snow.jpg"), this.x, this.y, 760, 760);
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
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/snow.jpg"), this.x, this.y, 760, 760);
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
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/snow.jpg"), this.x, this.y, 760, 760);
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
TileEight.prototype.constructor = TileEight;

TileEight.prototype.update = function () {

    Entity.prototype.update.call(this);
}

TileEight.prototype.draw = function (ctx) {
    if (this.game.menu) return;
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/desert.jpg"), this.x, this.y, 760, 760);
}
function EnemyType1(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 56;
    this.mp = 0;
    this.phystr = 4;
    this.phydef = 0;
    this.magstr = 1;
    this.magdef = 0;
    this.exp = 1;
    this.ap = 1;
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
    Entity.prototype.update.call(this);
}
EnemyType1.prototype.draw = function (ctx) {
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
}
function Hero(game, cen, col) {
    var center = cen;
    var column = col;
    this.hp = 100;
    this.mp = 10;
    this.phystr = 2;
    this.phydef = 3;
    this.magstr = 1;
    this.magdef = 0;
    this.exp = 0;
    this.ap = 0;
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
    this.currentX = 380;
    this.currentY = 380;
    this.currentClass = "Warrior";
    this.boundingbox = new BoundingBox(this.x, this.y, this.animation.frameWidth+20, this.animation.frameHeight+25);
    Entity.call(this, game, 380, 380);


}

Hero.prototype = new Entity();
Hero.prototype.constructor = Hero;

Hero.prototype.update = function () {
    if (this.game.running && !this.game.battleRunning) {
        this.boundingbox = new BoundingBox(this.x, this.y, this.animation.frameWidth + 20, this.animation.frameHeight + 25);
        if (this.game.up) {
            this.movingNorth = true;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = false;
            if (!this.boundingbox.collideTop(this.game.platforms[0].boundingbox)) {
                this.movingNorth = false;
                if (this.game.platforms[0].NorthTile !== null) {
                    //this.game.addEntity(this.game.platforms[0].NorthTile);
                }
            }
        } else if (this.game.left) {
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = true;
            this.movingEast = false;
            if (!this.boundingbox.collideLeft(this.game.platforms[0].boundingbox)) {
                this.movingWest = false;
                if (this.game.platforms[0].WestTile !== null) {
                    //this.game.addEntity(this.game.platforms[0].NorthTile);
                }
            }
        } else if (this.game.down) {
            this.movingNorth = false;
            this.movingSouth = true;
            this.movingWest = false;
            this.movingEast = false;
            if (!this.boundingbox.collideBottom(this.game.platforms[0].boundingbox)) {
                this.movingSouth = false;
                if (this.game.platforms[0].SouthTile !== null) {
                    //this.game.addEntity(this.game.platforms[0].NorthTile);
                }
            }
        } else if (this.game.right) {
            this.movingNorth = false;
            this.movingSouth = false;
            this.movingWest = false;
            this.movingEast = true;
            if (!this.boundingbox.collideRight(this.game.platforms[0].boundingbox)) {
                this.movingEast = false;
                if (this.game.platforms[0].EastTile !== null) {
                    //this.game.addEntity(this.game.platforms[0].NorthTile);
                }
            }
        }
    }
    this.currentClass = "Warrior";
    //console.log("Hero is at(" + this.x + "," + this.y + ")");

    Entity.prototype.update.call(this);
}

Hero.prototype.draw = function (ctx) {
    if (!this.game.running) return;
    if (this.game.battleRunning) {
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        return;
    }
    if (this.movingSouth && this.game.down) {
        this.game.down = false;
        this.y = this.y + 32.2;
        this.currentY = this.y;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Danimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Danimation;
    } else if (this.movingNorth && this.game.up) {
        this.game.up = false;
        this.y = this.y - 32.2;
        this.currentY = this.y;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Uanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Uanimation;
    } else if (this.movingWest && this.game.left) {
        this.game.left = false;
        this.x = this.x - 32.2;
        this.currentX = this.x;
        if (this.boxes) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.Lanimation.drawFrame(this.game.clockTick, ctx, this.x, this.y, 1.7);
        this.animation = this.Lanimation;
    } else if (this.movingEast && this.game.right) {
        this.game.left = false;
        this.x = this.x + 32.2;
        this.currentX = this.x;
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

}
// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/desert.jpg");
ASSET_MANAGER.queueDownload("./img/desert_battle.jpg");
ASSET_MANAGER.queueDownload("./img/grassland.jpg");
ASSET_MANAGER.queueDownload("./img/snow.jpg");
ASSET_MANAGER.queueDownload("./img/GoldenSun.png");
ASSET_MANAGER.queueDownload("./img/hell4.jpg");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    //Game Engine
    var gameEngine = new GameEngine();
    //Components
    gameEngine.running = true;
    gameEngine.battleRunning = false;


    var platforms = [];
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
    gameEngine.platforms = platforms;
    var heroes = [];
    var hero1 = new Hero(gameEngine, -1, 0);
    var hero2 = new Hero(gameEngine, 2, 0);
    var hero3 = new Hero(gameEngine, 5, 0);
    var hero4 = new Hero(gameEngine, 8, 0);
    var hero5 = new Hero(gameEngine, -1, 4);
    var hero6 = new Hero(gameEngine, 2, 4);
    gameEngine.hero = hero4;
    var menu = new Menu(gameEngine, 25, 25);
    var enemy1 = new EnemyType1(gameEngine, 2, 4);
    gameEngine.firstEnemy = enemy1;
    var battle = new Battle(gameEngine, 20, 20, gameEngine.hero, gameEngine.firstEnemy);

    //Adding components to Game Engine

    gameEngine.addEntity(gameEngine.platforms[0]);

    gameEngine.addEntity(hero4);
    gameEngine.addEntity(menu);
    gameEngine.addEntity(battle);

    gameEngine.init(ctx);
    gameEngine.start();
});