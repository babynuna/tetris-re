// ========================================================================
// RE OCTO INVADERS GAME JAVASCRIPT
// Kode Gabungan untuk Inisialisasi, Logika Game, dan Rendering
// ========================================================================

// --- Inisialisasi Kanvas & Ukuran Dinamis ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Atur ukuran canvas menjadi penuh layar
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Elemen UI (Hanya Overlay yang tersisa) ---
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');

// --- Konstanta Game ---
const PLAYER_SIZE = 60;
const PLAYER_SPEED = 5;
const BULLET_SIZE_WIDTH = 5;
const BULLET_SIZE_HEIGHT = 15;
const BULLET_SPEED = 10;
const ALIEN_SIZE = 30; 
const ALIEN_BASE_ROWS = 3;
const ALIEN_BASE_COLS = 8;
const ALIEN_BASE_SPEED_X = 1; 
const ALIEN_BASE_SPEED_Y = 20;
const ALIEN_FIRE_RATE = 200; 
const ALIEN_MOVE_INTERVAL = 30; 

// --- Variabel Game State ---
let player;
let playerBullets = [];
let alienBullets = [];
let aliens = [];
let score = 0;
let level = 1;
let isPlaying = false;
let alienDirection = 1; 
let alienMoveCounter = 0;
let keysPressed = {};
let gameLoopId;

// --- Variabel HP dan Starfield ---
let playerHP = 3; 
const MAX_HP = 3; 
const STAR_COUNT = 150;
let stars = [];
const STAR_SPEED = 1;

// --- Warna dari CSS ---
const PLAYER_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(); 
const ALIEN_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim(); 
const BULLET_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-bullet').trim(); 

// --- Objek Gambar Logo 're.png' ---
// PASTIKAN FILE 're.png' ADA DI FOLDER YANG SAMA DENGAN HTML/CSS!
let playerImage = new Image();
playerImage.src = 're.png'; 

// --- AUDIO PATHS ---
// PASTIKAN SEMUA FILE AUDIO ADA DI FOLDER 'audio/'
const BGM_URL = 'audio/bgm.mp3'; 
const SHOOT_SOUND_URL = 'audio/shoot.wav';
const EXPLODE_SOUND_URL = 'audio/explode.wav';
const GAMEOVER_SOUND_URL = 'audio/gameover.wav';


// --- AUDIO MANAGER CLASS ---
class AudioManager {
    constructor() {
        this.bgm = new Audio(BGM_URL);
        this.bgm.loop = true;
        this.bgm.volume = 0.4; 
    }

    playBGM() {
        this.bgm.play().catch(e => console.warn("BGM play failed (user interaction required or file not found)."));
    }

    pauseBGM() {
        this.bgm.pause();
    }
    
    playSFX(type) {
        let soundUrl;
        let volume = 0.5;

        if (type === 'shoot') {
            soundUrl = SHOOT_SOUND_URL;
            volume = 0.2;
        } else if (type === 'explode') {
            soundUrl = EXPLODE_SOUND_URL;
            volume = 0.5;
        } else if (type === 'gameover') {
            soundUrl = GAMEOVER_SOUND_URL;
            volume = 0.8;
            this.pauseBGM();
        }
        
        if (soundUrl) {
            // Gunakan Soundpool atau Array untuk memainkan SFX secara bersamaan
            const sound = new Audio(soundUrl);
            sound.volume = volume;
            sound.play().catch(e => console.warn(`SFX ${type} failed. Check console for 404 error.`));
        }
    }
}

const audioManager = new AudioManager();

// --- Pixel Art Alien ---
const ALIEN_OCTO_PIXELS = [
    [0,1,1,1,1,0],
    [1,1,0,0,1,1],
    [1,0,1,1,0,1],
    [1,1,1,1,1,1],
    [0,1,0,1,0,1],
    [1,0,1,0,1,0],
];

function drawPixelArt(ctx, x, y, size, pixelMap, color) {
    const pixelWidth = size / pixelMap[0].length;
    const pixelHeight = size / pixelMap.length;

    ctx.fillStyle = color;
    for (let row = 0; row < pixelMap.length; row++) {
        for (let col = 0; col < pixelMap[row].length; col++) {
            if (pixelMap[row][col] === 1) {
                ctx.fillRect(x + col * pixelWidth, y + row * pixelHeight, pixelWidth, pixelHeight);
            }
        }
    }
}

// --- Objek Game: Player, Bullet, Alien ---

class Player {
    constructor() {
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        // Penyesuaian posisi awal untuk layar penuh
        this.x = (canvas.width / 2) - (this.width / 2);
        this.y = canvas.height - this.height - 30; 
        this.color = PLAYER_COLOR; 
    }

    draw() {
        if (playerImage.complete && playerImage.naturalWidth !== 0) {
            ctx.drawImage(playerImage, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    move() {
        if (keysPressed['arrowleft'] || keysPressed['a']) {
            this.x -= PLAYER_SPEED;
        }
        if (keysPressed['arrowright'] || keysPressed['d']) {
            this.x += PLAYER_SPEED;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
    }

    shoot() {
        audioManager.playSFX('shoot'); 

        // Shot spreading berdasarkan level
        const shotCount = Math.min(1 + Math.floor((level - 1) / 2), 3);
        const spreadDistance = 12; 

        for (let i = 0; i < shotCount; i++) {
            let offset = 0;
            if (shotCount === 2) {
                offset = (i === 0) ? -spreadDistance / 2 : spreadDistance / 2;
            } else if (shotCount === 3) {
                offset = (i === 0) ? -spreadDistance : (i === 1) ? 0 : spreadDistance;
            } else {
                offset = 0;
            }
            
            playerBullets.push(new Bullet(
                this.x + this.width / 2 - BULLET_SIZE_WIDTH / 2 + offset, 
                this.y, 
                BULLET_SPEED, 
                BULLET_COLOR
            ));
        }
    }
}

class Bullet {
    constructor(x, y, speed, color, isAlienBullet = false) {
        this.x = x;
        this.y = y;
        this.width = BULLET_SIZE_WIDTH;
        this.height = BULLET_SIZE_HEIGHT;
        // Jika peluru musuh, speed negatif agar bergerak ke bawah
        this.speed = isAlienBullet ? -speed : speed; 
        this.color = color;
        this.isAlienBullet = isAlienBullet;
    }

    draw() {
        ctx.fillStyle = this.color;
        // Peluru musuh lebih pendek
        const currentHeight = this.isAlienBullet ? BULLET_SIZE_HEIGHT / 2 : BULLET_SIZE_HEIGHT;
        ctx.fillRect(this.x, this.y, this.width, currentHeight);
    }

    update() {
        // Gerak peluru. Jika speed positif (pemain), y berkurang (ke atas). 
        // Jika speed negatif (alien), y bertambah (ke bawah).
        this.y -= this.speed; 
    }
}

class Alien {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = ALIEN_SIZE;
        this.height = ALIEN_SIZE;
        this.color = ALIEN_COLOR;
        this.isAlive = true;
    }

    draw() {
        if (!this.isAlive) return;
        drawPixelArt(ctx, this.x, this.y, this.width, ALIEN_OCTO_PIXELS, this.color);
    }

    update(dx, dy) {
        if (!this.isAlive) return;
        this.x += dx;
        this.y += dy;
    }

    fire() {
        // Musuh menembak ke bawah
        alienBullets.push(new Bullet(this.x + this.width / 2 - BULLET_SIZE_WIDTH / 2, this.y + this.height, BULLET_SPEED / 2, ALIEN_COLOR, true));
    }
}

// --- Fungsi Game Logic dan Inisialisasi ---

function initGame(resetScore = true) {
    // Sesuaikan ulang ukuran canvas saat init (untuk responsivitas)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (resetScore) {
        score = 0;
        level = 1;
        playerHP = MAX_HP; 
    }
    
    // Reset Entitas Game
    player = new Player();
    playerBullets = [];
    alienBullets = [];
    aliens = [];
    alienDirection = 1;
    alienMoveCounter = 0;
    keysPressed = {};

    // Inisialisasi Starfield
    if (stars.length === 0 || resetScore) { // Reset starfield saat game baru
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5, 
                speed: STAR_SPEED * Math.random() + 0.5,
                color: 'rgba(255, 255, 255, ' + (Math.random() * 0.5 + 0.5) + ')'
            });
        }
    }

    // Inisialisasi Alien berdasarkan level
    const currentAlienCols = ALIEN_BASE_COLS + Math.min(level - 1, 4); 
    const currentAlienRows = ALIEN_BASE_ROWS + Math.min(level - 1, 2); 
    const totalAlienWidth = currentAlienCols * (ALIEN_SIZE + 20) - 20;
    const startX = (canvas.width - totalAlienWidth) / 2;

    for (let r = 0; r < currentAlienRows; r++) {
        for (let c = 0; c < currentAlienCols; c++) {
            const alienX = startX + c * (ALIEN_SIZE + 20);
            const alienY = 50 + r * (ALIEN_SIZE + 20);
            aliens.push(new Alien(alienX, alienY));
        }
    }
}

function updateGame() {
    if (!isPlaying) return;

    // 1. Update Starfield
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // 2. Update Player dan Peluru
    player.move();
    playerBullets.forEach((bullet, index) => {
        bullet.update();
        if (bullet.y < 0) playerBullets.splice(index, 1);
    });
    alienBullets.forEach((bullet, index) => {
        bullet.update();
        if (bullet.y > canvas.height) alienBullets.splice(index, 1);
    });


    // 3. Logika Pergerakan Alien & Musuh Menembak
    alienMoveCounter++;
    // Kecepatan alien bertambah setiap level
    const alienMoveInterval = ALIEN_MOVE_INTERVAL / (1 + (level-1)*0.1); 

    if (alienMoveCounter >= alienMoveInterval) { 
        let shouldDrop = false;
        const liveAliens = aliens.filter(a => a.isAlive);
        
        if (liveAliens.length === 0) {
            levelUp();
            return;
        }

        // Cek batas horizontal
        const leftmostAlien = Math.min(...liveAliens.map(a => a.x));
        const rightmostAlien = Math.max(...liveAliens.map(a => a.x + a.width));

        if ((alienDirection === 1 && rightmostAlien >= canvas.width - 20) || 
            (alienDirection === -1 && leftmostAlien <= 20)) { 
            shouldDrop = true;
        }

        if (shouldDrop) {
            alienDirection *= -1; 
            liveAliens.forEach(alien => alien.update(0, ALIEN_BASE_SPEED_Y)); 
        } else {
            const currentSpeedX = ALIEN_BASE_SPEED_X * (1 + (level-1)*0.1);
            liveAliens.forEach(alien => alien.update(alienDirection * currentSpeedX, 0)); 
        }

        // Alien menembak
        if (Math.random() < (1 / ALIEN_FIRE_RATE) * level) { 
            const firingAlien = liveAliens[Math.floor(Math.random() * liveAliens.length)];
            // Pastikan alien yang menembak berada di barisan paling bawah untuk tantangan yang lebih baik
            const bottomAliens = liveAliens.filter(a => a.x === firingAlien.x);
            const lowestAlien = bottomAliens.reduce((prev, current) => (prev.y > current.y) ? prev : current);

            lowestAlien.fire();
        }

        alienMoveCounter = 0; 
    }

    // 4. Deteksi Tabrakan
    // Peluru Pemain vs Alien (dengan Suara Ledakan)
    for (let bIndex = playerBullets.length - 1; bIndex >= 0; bIndex--) {
        const bullet = playerBullets[bIndex];
        let hit = false;
        for (let aIndex = aliens.length - 1; aIndex >= 0; aIndex--) {
            const alien = aliens[aIndex];
            if (alien.isAlive && 
                bullet.x < alien.x + alien.width && bullet.x + bullet.width > alien.x &&
                bullet.y < alien.y + alien.height && bullet.y + bullet.height > alien.y) {
                
                alien.isAlive = false; 
                playerBullets.splice(bIndex, 1); 
                score += 10 * level; 
                audioManager.playSFX('explode'); 
                hit = true;
                break;
            }
        }
        if (hit) continue;
    }

    // Peluru Alien vs Pemain (Sistem HP)
    for (let bIndex = alienBullets.length - 1; bIndex >= 0; bIndex--) {
        const bullet = alienBullets[bIndex];
        if (bullet.x < player.x + player.width && bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height && bullet.y + bullet.height > player.y) {
            
            alienBullets.splice(bIndex, 1); 
            
            playerHP--;
            
            if (playerHP <= 0) {
                gameOver("RE INVADER DOWN!");
                return;
            }
        }
    }

    // Alien vs Pemain (Game Over)
    for (const alien of aliens) {
        if (alien.isAlive && alien.y + alien.height >= player.y - 10) { 
            gameOver("INVADER REACHED YOUR BASE!");
            return;
        }
    }
}


// --- Fungsi Menggambar Stats di Canvas ---
function drawStats() {
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = BULLET_COLOR;
    
    // Draw Score (Kiri Atas)
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    
    // Draw Level (Tengah Atas)
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${level}`, canvas.width / 2, 30);
    
    // Draw HP (Kanan Atas sebagai Balok)
    ctx.textAlign = 'right';
    ctx.fillText(`HP: `, canvas.width - 150, 30);
    
    const hpXStart = canvas.width - 120;
    const hpY = 15;
    const hpSize = 15;
    const hpGap = 5;
    
    // Menggambar balok HP
    for (let i = 0; i < MAX_HP; i++) {
        if (i < playerHP) {
            ctx.fillStyle = '#ff4d4d'; // Merah untuk health
        } else {
            ctx.fillStyle = '#333333'; // Abu-abu gelap untuk HP yang hilang
        }
        ctx.fillRect(hpXStart + i * (hpSize + hpGap), hpY, hpSize, hpSize);
    }
}


function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Gambar Starfield
    stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Gambar Entitas Game
    player.draw();
    playerBullets.forEach(bullet => bullet.draw());
    alienBullets.forEach(bullet => bullet.draw());
    aliens.forEach(alien => alien.draw());
    
    // Gambar Stats di Canvas
    drawStats();
}

// --- Game Loop dan UI Flow ---
function gameLoop() {
    updateGame();
    drawGame();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function levelUp() {
    isPlaying = false;
    cancelAnimationFrame(gameLoopId);
    level++;
    showOverlay("LEVEL " + (level - 1) + " COMPLETE", "Wave berikutnya lebih cepat! Level " + level + " siap.", true, "NEXT LEVEL");
}

function showOverlay(title, message, showBtn = true, btnText = "START") {
    overlayTitle.textContent = title;
    overlayMessage.innerHTML = message;
    startButton.style.display = showBtn ? 'block' : 'none';
    startButton.textContent = btnText;
    gameOverlay.classList.add('active');
}

function hideOverlay() {
    gameOverlay.classList.remove('active');
}

function startGame() {
    hideOverlay();
    
    // Logika untuk menentukan apakah ini game baru (reset) atau naik level
    if (overlayTitle.textContent.includes("START") || overlayTitle.textContent.includes("DOWN") || overlayTitle.textContent.includes("BASE")) {
          initGame(true); 
    } else {
          initGame(false); // Naik level, pertahankan skor dan HP
    }
   
    audioManager.playBGM(); 
    isPlaying = true;
    gameLoop();
}

function gameOver(message) {
    isPlaying = false;
    cancelAnimationFrame(gameLoopId); 
    audioManager.playSFX('gameover'); 
    showOverlay(message, "Score Akhir: " + score + "<br>Press START.", true, "RESTART");
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = true;
    if (key === ' ' && isPlaying) {
        // Mencegah spasi menggulir halaman
        player.shoot();
        e.preventDefault(); 
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

startButton.addEventListener('click', () => {
    startGame();
});

window.addEventListener('resize', () => {
    // Sesuaikan ukuran canvas saat jendela diubah ukurannya
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Set ulang posisi pemain agar tetap di tengah bawah
    if (player) {
        player.x = (canvas.width / 2) - (player.width / 2);
        player.y = canvas.height - player.height - 30;
    }
});

// --- PENTING: Image Loader & Initial Setup ---
function setupGame() {
    showOverlay("RE OCTO INVADERS", 
                "Restake for Real Yield<br>HP: " + MAX_HP + ". <span class='key-highlight'>Space</span> Tembak, <span class='key-highlight'>A/D</span> Gerak.", true, "START");
    
    initGame(true);
    drawGame(); // Gambar frame pertama dengan overlay aktif
}

// Tunggu gambar pemain dimuat sebelum memulai game
playerImage.onload = () => {
    setupGame();
};

playerImage.onerror = () => {
    console.error("Gagal memuat gambar 're.png'. Menggunakan kotak fallback.");
    setupGame(); 
};

// Panggil setupGame jika gambar sudah dimuat sebelum event onload terpicu (jarang terjadi)
if (playerImage.complete && playerImage.naturalWidth !== 0) {
    setupGame();
}