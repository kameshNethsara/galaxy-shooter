// script.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameContainer = document.getElementById('gameContainer');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreElement = document.getElementById('score');
const healthElement = document.getElementById('health');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('finalScore');

// Game state
let player = {
    x: 400,
    y: 500,
    width: 40,
    height: 40,
    speed: 20,
    health: 100
};

let projectiles = [];
let enemies = [];
let particles = [];
let score = 0;
let level = 1;
let isGameOver = false;
let screenShake = 0;

// Sound functions
function playShootSound() {
    const osc = new OscillatorNode(context, { type: 'square', frequency: 800 });
    const gainNode = new GainNode(context, { gain: 0.1 });
    osc.connect(gainNode).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.1);
}

function playExplosionSound() {
    const osc = new OscillatorNode(context, { type: 'sawtooth', frequency: 200 });
    const gainNode = new GainNode(context, { gain: 0.1 });
    osc.connect(gainNode).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.3);
}

// Initialize audio context
const context = new (window.AudioContext || window.webkitAudioContext)();

// Setup canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.getElementById('mobileControls').classList.toggle('hidden', !isMobile());
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('touchstart', handleTouch);
document.getElementById('shootBtn').addEventListener('touchstart', shoot);

// Game functions
function startGame() {
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    resetGameState();
    gameLoop();
}

function resetGameState() {
    player.health = 100;
    score = 0;
    level = 1;
    projectiles = [];
    enemies = [];
    particles = [];
    isGameOver = false;
    updateUI();
}

function gameLoop() {
    if (isGameOver) return;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate(Math.random() * screenShake, Math.random() * screenShake);
        screenShake *= 0.9;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw game objects
    updatePlayer();
    updateProjectiles();
    updateEnemies();
    updateParticles();
    spawnEnemies();

    checkCollisions();
    checkLevelUp();

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    // Draw player
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function handleKeyDown(e) {
    if (isGameOver) return;

    const speed = player.speed;
    switch(e.key) {
        case 'ArrowLeft':
            player.x = Math.max(0, player.x - speed);
            break;
        case 'ArrowRight':
            player.x = Math.min(canvas.width - player.width, player.x + speed);
            break;
        case ' ':
            shoot();
            break;
    }
}

function handleTouch(e) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    player.x = touchX - player.width/2;
}

function shoot() {
    if (isGameOver) return;
    
    projectiles.push({
        x: player.x + player.width/2 - 2.5,
        y: player.y,
        width: 5,
        height: 10,
        speed: -8
    });
    playShootSound();
}

function spawnEnemies() {
    if (Math.random() < 0.02 * level) {
        enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2 + level * 0.5
        });
    }
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.y += enemy.speed;
        ctx.fillStyle = '#f44336';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
        }
    });
}

function updateProjectiles() {
    projectiles.forEach((projectile, index) => {
        projectile.y += projectile.speed;
        ctx.fillStyle = '#FFEB3B';
        ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);

        if (projectile.y + projectile.height < 0) {
            projectiles.splice(index, 1);
        }
    });
}

function checkCollisions() {
    // Projectile-enemy collisions
    projectiles.forEach((projectile, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (checkRectCollision(projectile, enemy)) {
                // Create explosion particles
                for (let i = 0; i < 10; i++) {
                    particles.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        radius: Math.random() * 3,
                        color: '#FF5722',
                        velocity: {
                            x: (Math.random() - 0.5) * 5,
                            y: (Math.random() - 0.5) * 5
                        },
                        alpha: 1
                    });
                }

                enemies.splice(eIndex, 1);
                projectiles.splice(pIndex, 1);
                score += 100;
                screenShake = 10;
                playExplosionSound();
                updateUI();
            }
        });
    });

    // Player-enemy collisions
    enemies.forEach(enemy => {
        if (checkRectCollision(player, enemy)) {
            player.health -= 10;
            updateUI();
            if (player.health <= 0) {
                gameOver();
            }
        }
    });
}

function checkRectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        particle.alpha -= 0.05;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 87, 34, ${particle.alpha})`;
        ctx.fill();

        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        }
    });
}

function checkLevelUp() {
    if (score >= level * 1000) {
        level++;
        updateUI();
    }
}

function updateUI() {
    scoreElement.textContent = score;
    healthElement.textContent = player.health;
    levelElement.textContent = level;
}

function gameOver() {
    isGameOver = true;
    gameContainer.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.textContent = score;
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Create star background
for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 2}s`;
    document.body.appendChild(star);
}