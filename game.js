class BlasterMasterGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.gameWidth = 512;
        this.gameHeight = 480;
        this.tileSize = 16;
        
        this.keys = {};
        this.lastTime = 0;
        this.gameMode = 'sideScrolling'; // sideScrolling, overhead
        
        this.camera = { x: 0, y: 0 };
        
        this.setupInput();
        this.initGame();
        this.gameLoop();
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
        });
    }
    
    initGame() {
        // Initialize player
        this.player = new Player(50, 350);
        
        // Initialize SOPHIA III tank
        this.tank = new SophiaTank(100, 350);
        
        // Initialize levels
        this.sideLevel = new Level();
        this.overheadLevel = new OverheadLevel();
        this.level = this.sideLevel;
        
        // Initialize game objects
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        
        // Game state
        this.playerInTank = false;
        
        // Initialize overhead player
        this.overheadPlayer = new OverheadPlayer(200, 150);
        
        // Add entrance door at the right side of the level
        this.entranceDoor = new EntranceDoor(900, 350, 24, 32);
    }
    
    update(deltaTime) {
        // Handle input
        this.handleInput();
        
        // Update based on game mode
        if (this.gameMode === 'sideScrolling') {
            // Update active character
            if (this.playerInTank) {
                this.tank.update(deltaTime, this.level);
            } else {
                this.player.update(deltaTime, this.level);
                
                // Check door collision
                if (this.isColliding(this.player, this.entranceDoor)) {
                    this.enterOverheadMode();
                }
            }
        } else {
            // Overhead mode
            this.overheadPlayer.update(deltaTime, this.level);
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime, this.level);
            return bullet.active;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.active;
        });
        
        // Update camera
        this.updateCamera();
        
        // Check collisions
        this.checkCollisions();
    }
    
    handleInput() {
        if (this.gameMode === 'sideScrolling') {
            // Tank entry/exit
            if (this.keys['Enter'] || this.keys['NumpadEnter']) {
                this.keys['Enter'] = false;
                this.keys['NumpadEnter'] = false;
                this.toggleTankMode();
            }
            
            // Get active character
            const activeChar = this.playerInTank ? this.tank : this.player;
            
            // Movement
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
                activeChar.moveLeft();
            }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                activeChar.moveRight();
            }
            if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                activeChar.moveUp();
            }
            if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                activeChar.moveDown();
            }
            
            // Shooting
            if (this.keys['Space']) {
                const bullet = activeChar.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                }
            }
        } else {
            // Overhead mode controls
            const player = this.overheadPlayer;
            
            // Reset movement
            player.velocityX = 0;
            player.velocityY = 0;
            
            // 8-directional movement
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
                player.velocityX = -player.speed;
                player.direction = 3; // left
            }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                player.velocityX = player.speed;
                player.direction = 1; // right
            }
            if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                player.velocityY = -player.speed;
                player.direction = 0; // up
            }
            if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                player.velocityY = player.speed;
                player.direction = 2; // down
            }
            
            // Shooting
            if (this.keys['Space']) {
                const bullet = player.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                }
            }
            
            // Exit overhead mode
            if (this.keys['Enter'] || this.keys['NumpadEnter']) {
                this.keys['Enter'] = false;
                this.keys['NumpadEnter'] = false;
                this.exitOverheadMode();
            }
        }
    }
    
    toggleTankMode() {
        if (this.playerInTank) {
            // Exit tank
            this.player.x = this.tank.x;
            this.player.y = this.tank.y - 20;
            this.playerInTank = false;
        } else {
            // Check if player is near tank
            const distance = Math.sqrt(
                Math.pow(this.player.x - this.tank.x, 2) + 
                Math.pow(this.player.y - this.tank.y, 2)
            );
            if (distance < 30) {
                this.playerInTank = true;
            }
        }
    }
    
    enterOverheadMode() {
        this.gameMode = 'overhead';
        this.level = this.overheadLevel;
        this.overheadPlayer.x = 200;
        this.overheadPlayer.y = 280;
        this.bullets = [];
        this.particles = [];
    }
    
    exitOverheadMode() {
        this.gameMode = 'sideScrolling';
        this.level = this.sideLevel;
        this.player.x = 850;
        this.player.y = 350;
        this.bullets = [];
        this.particles = [];
    }
    
    updateCamera() {
        let activeChar;
        
        if (this.gameMode === 'sideScrolling') {
            activeChar = this.playerInTank ? this.tank : this.player;
        } else {
            activeChar = this.overheadPlayer;
        }
        
        // Smooth camera follow
        const targetX = activeChar.x - this.gameWidth / 2;
        const targetY = activeChar.y - this.gameHeight / 2;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Clamp camera to level bounds
        if (this.gameMode === 'sideScrolling') {
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.width * this.tileSize - this.gameWidth));
            this.camera.y = Math.max(0, Math.min(this.camera.y, this.level.height * this.tileSize - this.gameHeight));
        } else {
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.roomWidth - this.gameWidth));
            this.camera.y = Math.max(0, Math.min(this.camera.y, this.level.roomHeight - this.gameHeight));
        }
    }
    
    checkCollisions() {
        // Bullet collisions would go here
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.gameMode === 'overhead' ? '#000033' : '#001122';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        
        // Save context for camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render level
        this.level.render(this.ctx, this.camera);
        
        if (this.gameMode === 'sideScrolling') {
            // Render tank
            this.tank.render(this.ctx);
            
            // Render player (only when not in tank)
            if (!this.playerInTank) {
                this.player.render(this.ctx);
            }
            
            // Render entrance door
            this.entranceDoor.render(this.ctx);
        } else {
            // Render overhead player
            this.overheadPlayer.render(this.ctx);
        }
        
        // Render bullets
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        
        // Render particles
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Restore context
        this.ctx.restore();
        
        // Render UI
        this.renderUI();
    }
    
    renderUI() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        
        if (this.gameMode === 'sideScrolling') {
            this.ctx.fillText(`Mode: ${this.playerInTank ? 'TANK' : 'PLAYER'}`, 10, 20);
            this.ctx.fillText(`Health: ${this.playerInTank ? this.tank.health : this.player.health}`, 10, 35);
            this.ctx.fillText('Walk to the door on the right to enter dungeon', 10, this.gameHeight - 10);
        } else {
            this.ctx.fillText('Mode: OVERHEAD DUNGEON', 10, 20);
            this.ctx.fillText(`Health: ${this.overheadPlayer.health}`, 10, 35);
            this.ctx.fillText('Press Enter to exit dungeon', 10, 50);
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 16;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 100;
        this.jumpPower = 200;
        this.onGround = false;
        this.health = 100;
        this.direction = 1; // 1 = right, -1 = left
        this.shootCooldown = 0;
    }
    
    update(deltaTime, level) {
        // Apply gravity
        this.velocityY += 500 * deltaTime;
        
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Collision with level
        this.handleCollisions(level);
        
        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        
        // Reset horizontal velocity
        this.velocityX = 0;
    }
    
    moveLeft() {
        this.velocityX = -this.speed;
        this.direction = -1;
    }
    
    moveRight() {
        this.velocityX = this.speed;
        this.direction = 1;
    }
    
    moveUp() {
        if (this.onGround) {
            this.velocityY = -this.jumpPower;
            this.onGround = false;
        }
    }
    
    moveDown() {
        // Crouch or fast fall
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = 0.2;
            return new Bullet(
                this.x + (this.direction > 0 ? this.width : 0),
                this.y + this.height / 2,
                this.direction * 200,
                0,
                'player'
            );
        }
        return null;
    }
    
    handleCollisions(level) {
        // Simple ground collision
        if (this.y + this.height > level.groundY) {
            this.y = level.groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Screen boundaries
        this.x = Math.max(0, Math.min(this.x, level.width * 16 - this.width));
    }
    
    render(ctx) {
        // Draw player as a green rectangle
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw direction indicator
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            this.x + (this.direction > 0 ? this.width - 2 : 0), 
            this.y + 2, 
            2, 2
        );
    }
}

class SophiaTank {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 20;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 80;
        this.health = 200;
        this.onGround = false;
        this.direction = 1;
        this.shootCooldown = 0;
        this.cannonAngle = 0;
    }
    
    update(deltaTime, level) {
        // Apply gravity
        this.velocityY += 500 * deltaTime;
        
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Collision with level
        this.handleCollisions(level);
        
        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        
        // Reset horizontal velocity
        this.velocityX = 0;
    }
    
    moveLeft() {
        this.velocityX = -this.speed;
        this.direction = -1;
    }
    
    moveRight() {
        this.velocityX = this.speed;
        this.direction = 1;
    }
    
    moveUp() {
        this.cannonAngle = Math.max(-Math.PI / 3, this.cannonAngle - 0.1);
    }
    
    moveDown() {
        this.cannonAngle = Math.min(Math.PI / 3, this.cannonAngle + 0.1);
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = 0.3;
            const angle = this.cannonAngle + (this.direction < 0 ? Math.PI : 0);
            return new Bullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * 300,
                Math.sin(angle) * 300,
                'tank'
            );
        }
        return null;
    }
    
    handleCollisions(level) {
        // Simple ground collision
        if (this.y + this.height > level.groundY) {
            this.y = level.groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Screen boundaries
        this.x = Math.max(0, Math.min(this.x, level.width * 16 - this.width));
    }
    
    render(ctx) {
        // Draw tank body
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(this.x, this.y + 8, this.width, this.height - 8);
        
        // Draw tank treads
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - 2, this.y + this.height - 4, this.width + 4, 4);
        
        // Draw cannon
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + 8);
        ctx.rotate(this.cannonAngle + (this.direction < 0 ? Math.PI : 0));
        ctx.fillStyle = '#004499';
        ctx.fillRect(0, -2, 16 * this.direction, 4);
        ctx.restore();
        
        // Draw turret
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(this.x + 6, this.y, 12, 12);
    }
}

class OverheadPlayer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 120;
        this.health = 100;
        this.direction = 0; // 0=up, 1=right, 2=down, 3=left
        this.shootCooldown = 0;
    }
    
    update(deltaTime, level) {
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Collision with level bounds
        this.handleCollisions(level);
        
        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
    }
    
    handleCollisions(level) {
        // Room boundaries
        this.x = Math.max(20, Math.min(this.x, level.roomWidth - 20 - this.width));
        this.y = Math.max(20, Math.min(this.y, level.roomHeight - 20 - this.height));
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = 0.25;
            
            const directions = [
                { x: 0, y: -1 },  // up
                { x: 1, y: 0 },   // right
                { x: 0, y: 1 },   // down
                { x: -1, y: 0 }   // left
            ];
            
            const dir = directions[this.direction];
            
            return new Bullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                dir.x * 250,
                dir.y * 250,
                'overhead'
            );
        }
        return null;
    }
    
    render(ctx) {
        // Draw player as a green circle
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator
        ctx.fillStyle = '#ffffff';
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        const directions = [
            { x: 0, y: -6 },  // up
            { x: 6, y: 0 },   // right
            { x: 0, y: 6 },   // down
            { x: -6, y: 0 }   // left
        ];
        
        const dir = directions[this.direction];
        ctx.fillRect(centerX + dir.x - 1, centerY + dir.y - 1, 2, 2);
    }
}

class Bullet {
    constructor(x, y, velocityX, velocityY, type) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.width = 4;
        this.height = 4;
        this.type = type;
        this.active = true;
        this.lifetime = 3;
    }
    
    update(deltaTime, level) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.active = false;
        }
        
        // Check bounds
        if (this.x < 0 || this.x > 2000 || this.y < 0 || this.y > 1000) {
            this.active = false;
        }
    }
    
    render(ctx) {
        let color = '#ffff00'; // player
        if (this.type === 'tank') color = '#ff6600';
        if (this.type === 'overhead') color = '#00ffff';
        
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Level {
    constructor() {
        this.width = 64;
        this.height = 30;
        this.groundY = 400;
        this.tiles = this.generateLevel();
    }
    
    generateLevel() {
        const tiles = [];
        for (let y = 0; y < this.height; y++) {
            tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                if (y > 25) {
                    tiles[y][x] = 1; // Ground
                } else {
                    tiles[y][x] = 0; // Air
                }
            }
        }
        return tiles;
    }
    
    render(ctx, camera) {
        const tileSize = 16;
        const startX = Math.floor(camera.x / tileSize);
        const endX = Math.min(startX + Math.ceil(512 / tileSize) + 1, this.width);
        const startY = Math.floor(camera.y / tileSize);
        const endY = Math.min(startY + Math.ceil(480 / tileSize) + 1, this.height);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                if (tile === 1) {
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                }
            }
        }
    }
}

class OverheadLevel {
    constructor() {
        this.roomWidth = 400;
        this.roomHeight = 300;
        this.tileSize = 16;
        this.tiles = this.generateRoom();
    }
    
    generateRoom() {
        const tilesX = Math.ceil(this.roomWidth / this.tileSize);
        const tilesY = Math.ceil(this.roomHeight / this.tileSize);
        const tiles = [];
        
        for (let y = 0; y < tilesY; y++) {
            tiles[y] = [];
            for (let x = 0; x < tilesX; x++) {
                // Create walls around the perimeter
                if (x === 0 || x === tilesX - 1 || y === 0 || y === tilesY - 1) {
                    tiles[y][x] = 1; // Wall
                } else {
                    tiles[y][x] = 0; // Floor
                }
            }
        }
        
        return tiles;
    }
    
    render(ctx, camera) {
        // Draw floor
        ctx.fillStyle = '#222244';
        ctx.fillRect(0, 0, this.roomWidth, this.roomHeight);
        
        // Draw walls
        for (let y = 0; y < this.tiles.length; y++) {
            for (let x = 0; x < this.tiles[y].length; x++) {
                const tile = this.tiles[y][x];
                if (tile === 1) {
                    ctx.fillStyle = '#666666';
                    ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
    }
}

class EntranceDoor {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        // Draw door frame
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw door
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        
        // Draw door handle
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x + this.width - 6, this.y + this.height / 2 - 1, 2, 2);
        
        // Draw "ENTER" text above door
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText('DOOR', this.x - 2, this.y - 5);
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.velocityX = (Math.random() - 0.5) * 100;
        this.velocityY = (Math.random() - 0.5) * 100;
        this.lifetime = 1;
        this.maxLifetime = 1;
        this.active = true;
    }
    
    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.lifetime -= deltaTime;
        
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// Start the game
window.addEventListener('load', () => {
    new BlasterMasterGame();
});