/**
 * Pixel Morph - Transform Your Art
 * Physics-based particle animation that morphs drawings into target images.
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

// Represents a particle that will replace another when it finishes morphing
class ReplacementParticle extends Particle {
    constructor(x, y, targetX, targetY, color, delay, targetSlot, particleToReplace) {
        super(x, y, targetX, targetY, color, delay);
        this.targetSlot = targetSlot; // The target pool slot this particle is aiming for
        this.particleToReplace = particleToReplace; // The old particle to remove when we finish
        this.isReplacement = true;
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
        this.showHelpOnStart = !localStorage.getItem('pixelMorphHelpSeen');

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
            morphProgress: document.getElementById('morphProgress'),
            morphStatus: document.getElementById('morphStatus'),
            downloadBtn: document.getElementById('downloadBtn'),
            helpBtn: document.getElementById('helpBtn'),
            helpTooltip: document.getElementById('helpTooltip'),
            helpClose: document.getElementById('helpClose'),
            helpGotIt: document.getElementById('helpGotIt'),
            brushCursor: document.getElementById('brushCursor'),
            progressBar: document.getElementById('progressBar'),
            progressLabel: document.getElementById('progressLabel'),
            presetColors: document.getElementById('presetColors'),
            motionTrails: document.getElementById('motionTrails')
        };

        this.targetPool = []; // Initialize immediately to avoid length of undefined

        this.init();
    }

    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        await this.loadTargetImage(typeof DEFAULT_IMAGE !== 'undefined' ? DEFAULT_IMAGE : 'obama.jpg');
        this.animate();

        // Show help on first visit
        if (this.showHelpOnStart) {
            this.showHelp();
        }
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

        // Update brush cursor size
        this.updateBrushCursor();
    }

    setupEventListeners() {
        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateBrushCursorPosition(e);
            this.draw(e);
        });
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => {
            this.stopDrawing();
            this.controls.brushCursor.style.opacity = '0';
        });
        this.canvas.addEventListener('mouseenter', () => {
            this.controls.brushCursor.style.opacity = '1';
        });

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
            this.controls.brushDensityValue.textContent = this.controls.brushDensity.value + ' particles/stroke';
            this.updateBrushCursor();
        });

        this.controls.resolution.addEventListener('input', () => {
            const val = parseInt(this.controls.resolution.value);
            // Resolution determines pixel spacing (lower = more pixels = finer detail)
            if (val <= 2) {
                this.controls.resolutionValue.textContent = 'Ultra (slow)';
            } else if (val <= 4) {
                this.controls.resolutionValue.textContent = 'High';
            } else if (val <= 8) {
                this.controls.resolutionValue.textContent = 'Medium';
            } else if (val <= 14) {
                this.controls.resolutionValue.textContent = 'Low';
            } else {
                this.controls.resolutionValue.textContent = 'Draft';
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

        // Download button
        this.controls.downloadBtn.addEventListener('click', () => this.downloadCanvas());

        // Help button and modal
        this.controls.helpBtn.addEventListener('click', () => this.showHelp());
        this.controls.helpClose.addEventListener('click', () => this.hideHelp());
        this.controls.helpGotIt.addEventListener('click', () => this.hideHelp());

        // Color presets
        this.controls.presetColors.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-preset')) {
                const color = e.target.dataset.color;
                this.controls.brushColor.value = color;

                // Update active state
                document.querySelectorAll('.color-preset').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });

        window.addEventListener('resize', () => {
            this.updateBrushCursor();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case 'c':
                    this.clearCanvas();
                    break;
                case 'd':
                    this.downloadCanvas();
                    break;
                case 'h':
                    if (this.controls.helpTooltip.classList.contains('hidden')) {
                        this.showHelp();
                    } else {
                        this.hideHelp();
                    }
                    break;
                case 'escape':
                    this.hideHelp();
                    break;
            }
        });
    }

    updateBrushCursor() {
        const radius = 30; // Fixed spread radius for consistency
        const size = radius * 2;
        this.controls.brushCursor.style.width = size + 'px';
        this.controls.brushCursor.style.height = size + 'px';
    }

    updateBrushCursorPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Position cursor relative to canvas wrapper
        this.controls.brushCursor.style.left = x + 'px';
        this.controls.brushCursor.style.top = y + 'px';

        // Update cursor color based on brush color
        const color = this.controls.brushColor.value;
        this.controls.brushCursor.style.borderColor = color;
        this.controls.brushCursor.style.boxShadow = `0 0 15px ${color}40`;
    }

    showHelp() {
        this.controls.helpTooltip.classList.remove('hidden');
    }

    hideHelp() {
        this.controls.helpTooltip.classList.add('hidden');
        localStorage.setItem('pixelMorphHelpSeen', 'true');
    }

    downloadCanvas() {
        // Don't download empty canvas
        if (this.particles.length === 0) {
            this.controls.morphStatus.textContent = 'Draw something first!';
            setTimeout(() => {
                this.updateMorphStatus('Ready to draw');
            }, 2000);
            return;
        }

        // Create a temporary canvas to render without trails
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill background
        tempCtx.fillStyle = '#0d0d12';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw all particles
        this.particles.forEach(p => {
            tempCtx.fillStyle = p.color;
            tempCtx.fillRect(p.x, p.y, p.size, p.size);
        });

        // Create download link
        const link = document.createElement('a');
        link.download = `pixel-morph-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
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
            img.onerror = () => {
                console.error('Failed to load target image:', src);
                // Resolve anyway to prevent hanging
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
        this.updateMorphStatus('Drawing...');
        // Add visual feedback class to canvas wrapper
        this.canvas.parentElement.classList.add('drawing');
        this.draw(e);
    }

    stopDrawing() {
        this.isDrawing = false;

        // Start 3s delay before morphing starts/resumes
        if (this.morphTimeout) clearTimeout(this.morphTimeout);
        this.updateMorphStatus('Morphing in 3s...');

        this.morphTimeout = setTimeout(() => {
            this.isMorphing = true;
            this.morphStartFrame = this.frameCount;
            this.morphTimeout = null;
            this.updateMorphStatus('Morphing...');
        }, 3000);

        // Remove drawing visual feedback
        this.canvas.parentElement.classList.remove('drawing');

        if (this.controls.cycleColor.checked) {
            const nextColor = this.getRandomColor();
            // Convert to hex if needed or just use as is for input type="color" might need hex
            const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
            this.controls.brushColor.value = `#${r}${g}${b}`;
        }
    }

    updateMorphStatus(status) {
        this.controls.morphStatus.textContent = status;
        // Remove all state classes first
        this.controls.morphStatus.classList.remove('morphing', 'drawing', 'waiting', 'complete');

        // Add appropriate class based on status
        if (status === 'Morphing...') {
            this.controls.morphStatus.classList.add('morphing');
        } else if (status === 'Drawing...') {
            this.controls.morphStatus.classList.add('drawing');
        } else if (status.includes('3s')) {
            this.controls.morphStatus.classList.add('waiting');
        } else if (status === 'Complete!') {
            this.controls.morphStatus.classList.add('complete');
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

                // Safety check: ensure we found a valid target
                if (!bestTarget) continue;

                if (bestTarget.occupiedBy) {
                    // Only consider replacement if the existing particle has FINISHED morphing
                    // This prevents removing still-moving particles
                    if (!bestTarget.occupiedBy.morphed) {
                        // Target is occupied by a still-morphing particle, skip it
                        continue;
                    }

                    // Convergence Logic: Only replace if the new color is a significantly better match
                    let currentColor = pixelColor;

                    // "Favor Original Colors" logic: Sprinkle in original colors (50% chance)
                    if (this.controls.favorColors.checked && Math.random() < 0.5) {
                        currentColor = `rgb(${bestTarget.r},${bestTarget.g},${bestTarget.b})`;
                    }

                    const currentMatch = this.colorDistance(bestTarget.occupiedBy.rgb, { r: bestTarget.r, g: bestTarget.g, b: bestTarget.b });
                    const newMatch = this.colorDistance(this.parseRgbForPenalty(currentColor), { r: bestTarget.r, g: bestTarget.g, b: bestTarget.b });

                    if (newMatch < currentMatch * 0.9) {
                        // Create a REPLACEMENT particle that will remove the old one when it finishes
                        const oldParticle = bestTarget.occupiedBy;
                        const replacementParticle = new ReplacementParticle(
                            px, py,
                            bestTarget.x, bestTarget.y,
                            currentColor,
                            delay,
                            bestTarget,
                            oldParticle
                        );
                        // Mark the target as now being claimed by the replacement
                        bestTarget.occupiedBy = replacementParticle;
                        bestTarget.pendingReplacement = oldParticle; // Track the old particle for removal
                        this.particles.push(replacementParticle);
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

        // Reset target pool occupancy and pending replacements
        this.targetPool.forEach(t => {
            t.occupiedBy = null;
            t.pendingReplacement = null;
        });

        // Clear any pending morph timeout
        if (this.morphTimeout) {
            clearTimeout(this.morphTimeout);
            this.morphTimeout = null;
        }

        this.updateStats();
        this.updateMorphStatus('Ready to draw');
    }

    updateStats() {
        this.controls.pixelCount.textContent = `Pixels: ${this.particles.length}`;
        const morphedCount = this.particles.filter(p => p.morphed).length;
        const percent = this.particles.length > 0 ? Math.round((morphedCount / this.particles.length) * 100) : 0;
        this.controls.morphProgress.textContent = `Morphed: ${percent}%`;

        // Update progress bar
        this.controls.progressBar.style.width = percent + '%';
        this.controls.progressLabel.textContent = `${percent}% Complete`;

        // Update morph status when complete
        if (percent === 100 && this.particles.length > 0) {
            this.updateMorphStatus('Complete!');
        }
    }

    animate() {
        this.frameCount++;

        // Check if motion trails are enabled
        const trailsEnabled = this.controls.motionTrails.checked;

        if (trailsEnabled) {
            // Semi-transparent fill for motion trails / glow effect
            this.ctx.fillStyle = 'rgba(13, 13, 18, 0.15)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Clear canvas completely for no trails
            this.ctx.fillStyle = '#0d0d12';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Track particles to remove (old particles replaced by new ones)
        const particlesToRemove = new Set();

        if (this.isMorphing) {
            this.particles.forEach(p => {
                const wasMorphed = p.morphed;
                p.update(this.frameCount, this.morphStartFrame);

                // Check if a replacement particle just finished morphing
                if (!wasMorphed && p.morphed && p.isReplacement && p.particleToReplace) {
                    // The replacement has arrived! Remove the old particle
                    particlesToRemove.add(p.particleToReplace);
                    // Clear the reference
                    p.particleToReplace = null;
                    p.isReplacement = false;
                }
            });
        }

        // Remove replaced particles
        if (particlesToRemove.size > 0) {
            this.particles = this.particles.filter(p => !particlesToRemove.has(p));
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
