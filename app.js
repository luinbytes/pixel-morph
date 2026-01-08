/**
 * Pixel Morph - Obama Edition
 * Re-implemented with physics-based particles for smooth animation.
 */

class Particle {
    constructor(x, y, targetX, targetY, color, delay) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = 2;
        this.delay = delay;
        this.morphed = false;
        // Varied ease for natural staggered arrival
        this.ease = 0.02 + Math.random() * 0.05;
        this.friction = 0.85 + Math.random() * 0.1;
        this.rgb = this.parseRgb(color);
    }

    parseRgb(color) {
        if (color.startsWith('rgb')) {
            const matches = color.match(/[\d.]+/g);
            return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2]),
                a: matches[3] ? parseFloat(matches[3]) : 1.0
            };
        }
        // Basic hex support inside particle for completeness
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 1.0
        } : { r: 255, g: 255, b: 255, a: 1.0 };
    }

    update(currentFrame, morphStartFrame) {
        if (this.morphed) return; // Stop processing if already at target
        if (currentFrame < morphStartFrame + this.delay) return;

        // Movement physics
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Smooth acceleration towards target
        this.vx += dx * this.ease;
        this.vy += dy * this.ease;

        // Organic noise - scale it down as we get closer to target
        // This prevents "bouncing around" indefinitely when near the goal
        const noiseScale = Math.min(1.0, distance / 100);
        if (distance > 2) {
            this.vx += (Math.random() - 0.5) * 2.0 * noiseScale;
            this.vy += (Math.random() - 0.5) * 2.0 * noiseScale;
        }

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;

        // Snapping threshold - slightly increased for faster settling
        if (distance < 0.5) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.vx = 0;
            this.vy = 0;
            this.morphed = true;
        }
    }

    // New method to update particle's properties for replacement logic
    updateTarget(px, py, newColor, delay, newTargetX, newTargetY) {
        this.x = px;
        this.y = py;
        this.targetX = newTargetX;
        this.targetY = newTargetY;
        this.color = newColor;
        this.rgb = this.parseRgb(newColor);
        this.delay = delay; // Reset delay for the new morph
        this.morphed = false; // Particle is no longer morphed, needs to move to new target
        this.vx = (Math.random() - 0.5) * 5; // Give it some initial velocity
        this.vy = (Math.random() - 0.5) * 5;
        this.progress = 0; // Reset progress if used for other animations
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class MorphApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.particles = [];
        this.targetPixels = [];
        this.isDrawing = false;
        this.lastDrawTime = Date.now();
        this.isMorphing = false;
        this.morphStartFrame = 0;
        this.frameCount = 0;
        this.morphTimeout = null;

        // Controls
        this.controls = {
            brushColor: document.getElementById('brushColor'),
            brushDensity: document.getElementById('brushDensity'),
            clearBtn: document.getElementById('clearBtn'),
            uploadBtn: document.getElementById('uploadBtn'),
            imageUpload: document.getElementById('imageUpload'),
            brushDensityValue: document.getElementById('brushDensityValue'),
            resolution: document.getElementById('resolution'),
            resolutionValue: document.getElementById('resolutionValue'),
            randomPixels: document.getElementById('randomPixels'),
            cycleColor: document.getElementById('cycleColor'),
            favorColors: document.getElementById('favorColors'),
            favorColorsContainer: document.getElementById('favorColorsContainer'),
            pixelCount: document.getElementById('pixelCount'),
            morphProgress: document.getElementById('morphProgress')
        };

        this.targetPool = []; // Initialize immediately to avoid length of undefined

        this.init();
    }

    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        await this.loadTargetImage('obama.jpg');
        this.animate();
    }

    setupCanvas() {
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.6;

        // Use a base aspect ratio but allow it to be overridden by image
        this.canvas.width = 600;
        this.canvas.height = 450;

        // Apply responsive styling
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';

        // Initial clear
        this.ctx.fillStyle = '#0d0d12';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEventListeners() {
        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());

        // Control events
        this.controls.brushDensity.addEventListener('input', () => {
            this.controls.brushDensityValue.textContent = this.controls.brushDensity.value + ' px/move';
        });

        this.controls.resolution.addEventListener('input', () => {
            const val = parseInt(this.controls.resolution.value);
            // Expanded resolution range mapping
            if (val <= 2) {
                this.controls.resolutionValue.textContent = 'High';
            } else if (val <= 5) {
                this.controls.resolutionValue.textContent = 'Medium';
            } else if (val <= 10) { // New range
                this.controls.resolutionValue.textContent = 'Low';
            } else { // Even lower
                this.controls.resolutionValue.textContent = 'Very Low';
            }
            if (this.currentImgSrc) {
                this.loadTargetImage(this.currentImgSrc);
            }
        });

        this.controls.randomPixels.addEventListener('change', () => {
            if (this.controls.randomPixels.checked) {
                this.controls.cycleColor.checked = false;
            }
            this.updateConditionalControls();
        });

        this.controls.cycleColor.addEventListener('change', () => {
            if (this.controls.cycleColor.checked) {
                this.controls.randomPixels.checked = false;
            }
            this.updateConditionalControls();
        });

        this.controls.clearBtn.addEventListener('click', () => this.clearCanvas());

        this.controls.uploadBtn.addEventListener('click', () => {
            this.controls.imageUpload.click();
        });

        this.controls.imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.loadTargetImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        window.addEventListener('resize', () => {
            // Logic for resizing if needed, but we have fixed size for now
        });
    }

    updateConditionalControls() {
        const isAnyRandomOn = this.controls.randomPixels.checked || this.controls.cycleColor.checked;
        this.controls.favorColorsContainer.style.display = isAnyRandomOn ? 'flex' : 'none';
        if (!isAnyRandomOn) {
            this.controls.favorColors.checked = false;
        }
    }

    async loadTargetImage(src) {
        this.currentImgSrc = src; // Store current source for resolution changes
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.canvas.width;
                tempCanvas.height = this.canvas.height;

                const imgAspect = img.width / img.height;
                const canvasAspect = this.canvas.width / this.canvas.height;

                // Use "contain" scaling to ensure the image fits the canvas
                let scale;
                if (imgAspect > canvasAspect) {
                    scale = this.canvas.width / img.width;
                } else {
                    scale = this.canvas.height / img.height;
                }

                const x = (this.canvas.width - img.width * scale) / 2;
                const y = (this.canvas.height - img.height * scale) / 2;
                tempCtx.drawImage(img, x, y, img.width * scale, img.height * scale);

                const imageData = tempCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
                const width = this.canvas.width;
                const height = this.canvas.height;
                this.targetPool = [];

                const step = parseInt(this.controls.resolution.value);
                for (let y = 1; y < height - 1; y += step) {
                    for (let x = 1; x < width - 1; x += step) {
                        const index = (y * width + x) * 4;
                        const r = imageData[index];
                        const g = imageData[index + 1];
                        const b = imageData[index + 2];
                        const a = imageData[index + 3];

                        if (a > 20) { // Even lower alpha threshold for scanning
                            const brightness = (r + g + b) / 3;
                            if (brightness >= 0) { // Accept all pixels that have some visibility
                                // Calculate a "detail score" based on local contrast (Sobel-like)
                                // This highlights edges/features like eyes, nose, mouth
                                const left = (imageData[index - 4] + imageData[index - 3] + imageData[index - 2]) / 3;
                                const right = (imageData[index + 4] + imageData[index + 5] + imageData[index + 6]) / 3;
                                const up = (imageData[index - width * 4] + imageData[index - width * 4 + 1] + imageData[index - width * 4 + 2]) / 3;
                                const down = (imageData[index + width * 4] + imageData[index + width * 4 + 1] + imageData[index + width * 4 + 2]) / 3;

                                const contrast = Math.abs(left - right) + Math.abs(up - down);

                                // Face area in the Shepard Fairey poster is usually high-contrast or distinct values
                                // We weight face areas (middle-upper part of image) slightly higher
                                const centerY = height * 0.4;
                                const distY = Math.abs(y - centerY) / height;
                                const yWeight = 1.0 - distY;

                                this.targetPool.push({
                                    x, y,
                                    r, g, b,
                                    score: contrast * yWeight + (brightness > 150 ? 50 : 0),
                                    occupiedBy: null // Track which particle is filling this target
                                });
                            }
                        }
                    }
                }

                // Sort pool by score: highest detail (face features) first
                this.targetPool.sort((a, b) => b.score - a.score);

                console.log(`Loaded ${this.targetPool.length} target pixels, sorted by feature priority`);
                resolve();
            };
            img.src = src;
        });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const a = Math.random().toFixed(2);
        return `rgba(${r},${g},${b},${a})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    colorDistance(c1, c2) {
        return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
    }

    // Helper for penalty calculation without updating particle
    parseRgbForPenalty(color) {
        if (color.startsWith('rgb')) {
            const matches = color.match(/[\d.]+/g);
            return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2]),
                a: matches[3] ? parseFloat(matches[3]) : 1.0
            };
        }
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 1.0
        } : { r: 255, g: 255, b: 255, a: 1.0 };
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.isMorphing = false; // Immediately pause morphing
        if (this.morphTimeout) {
            clearTimeout(this.morphTimeout);
            this.morphTimeout = null;
        }
        this.draw(e);
    }

    stopDrawing() {
        this.isDrawing = false;

        // Start 3s delay before morphing starts/resumes
        if (this.morphTimeout) clearTimeout(this.morphTimeout);
        this.morphTimeout = setTimeout(() => {
            this.isMorphing = true;
            this.morphStartFrame = this.frameCount;
            this.morphTimeout = null;
        }, 3000);

        if (this.controls.cycleColor.checked) {
            const nextColor = this.getRandomColor();
            // Convert to hex if needed or just use as is for input type="color" might need hex
            const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            this.controls.brushColor.value = `#${r}${g}${b}`;
        }
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const pos = {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
        const color = this.controls.brushColor.value;
        const count = parseInt(this.controls.brushDensity.value); // Exact particle count as requested
        const radius = 30; // Fixed spread radius for consistency

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * radius; // Uniform distribution
            const px = pos.x + Math.cos(angle) * dist;
            const py = pos.y + Math.sin(angle) * dist;

            if (this.targetPool.length > 0) {
                let pixelColor = color;
                if (this.controls.randomPixels.checked) {
                    pixelColor = this.getRandomColor();
                }

                // Parse RGB and Alpha
                let pixelRgb;
                if (pixelColor.startsWith('rgb')) {
                    const matches = pixelColor.match(/[\d.]+/g);
                    pixelRgb = {
                        r: parseInt(matches[0]),
                        g: parseInt(matches[1]),
                        b: parseInt(matches[2]),
                        a: matches[3] ? parseFloat(matches[3]) : 1.0
                    };
                } else {
                    const rgb = this.hexToRgb(pixelColor);
                    pixelRgb = { ...rgb, a: 1.0 };
                }

                // Spatial Sampling: Try to find an UNASSIGNED target near the cursor first
                let bestTarget = null;
                let minPenalty = Infinity;

                // We'll sample 40 targets to find the best balance
                for (let j = 0; j < 40; j++) {
                    const idx = Math.floor(Math.random() * this.targetPool.length);
                    const t = this.targetPool[idx];

                    const d = Math.sqrt((t.x - px) ** 2 + (t.y - py) ** 2);
                    const colorD = this.colorDistance(pixelRgb, { r: t.r, g: t.g, b: t.b });

                    // Penalty logic:
                    // 1. Favor distance heavily (stay under brush)
                    // 2. Favor unoccupied targets (high penalty if occupied)
                    // 3. Favor high-priority scores
                    const occupationPenalty = t.occupiedBy ? 1000 : 0;
                    const priorityBonus = (100 / (1 + t.score));
                    const penalty = d + (colorD * pixelRgb.a) + occupationPenalty + priorityBonus;

                    if (penalty < minPenalty) {
                        minPenalty = penalty;
                        bestTarget = t;
                    }
                }

                const delay = Math.random() * 150;

                if (bestTarget.occupiedBy) {
                    // Convergence Logic: Only update if the new color is a significantly better match
                    let currentColor = pixelColor;

                    // "Favor Original Colors" logic: Sprinkle in original colors (50% chance)
                    if (this.controls.favorColors.checked && Math.random() < 0.5) {
                        currentColor = `rgb(${bestTarget.r},${bestTarget.g},${bestTarget.b})`;
                    }

                    const currentMatch = this.colorDistance(bestTarget.occupiedBy.rgb, { r: bestTarget.r, g: bestTarget.g, b: bestTarget.b });
                    const newMatch = this.colorDistance(this.parseRgbForPenalty(currentColor), { r: bestTarget.r, g: bestTarget.g, b: bestTarget.b });

                    if (newMatch < currentMatch * 0.9) {
                        bestTarget.occupiedBy.updateTarget(px, py, currentColor, delay, bestTarget.x, bestTarget.y);
                    }
                } else {
                    let currentColor = pixelColor;
                    if (this.controls.favorColors.checked && Math.random() < 0.5) {
                        currentColor = `rgb(${bestTarget.r},${bestTarget.g},${bestTarget.b})`;
                    }

                    const particle = new Particle(px, py, bestTarget.x, bestTarget.y, currentColor, delay);
                    bestTarget.occupiedBy = particle;
                    this.particles.push(particle);
                }
            }
        }

        this.updateStats();
    }

    clearCanvas() {
        this.particles = [];
        this.isMorphing = false;
        this.updateStats();
    }

    updateStats() {
        this.controls.pixelCount.textContent = `Pixels: ${this.particles.length}`;
        const morphedCount = this.particles.filter(p => p.morphed).length;
        const percent = this.particles.length > 0 ? Math.round((morphedCount / this.particles.length) * 100) : 0;
        this.controls.morphProgress.textContent = `Morphed: ${percent}%`;
    }

    animate() {
        this.frameCount++;

        // Semi-transparent fill for motion trails / glow effect
        this.ctx.fillStyle = 'rgba(13, 13, 18, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isMorphing) {
            this.particles.forEach(p => p.update(this.frameCount, this.morphStartFrame));
        }

        this.particles.forEach(p => {
            p.draw(this.ctx);
        });

        if (this.isMorphing && this.frameCount % 30 === 0) {
            this.updateStats();
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Start the app
new MorphApp();
