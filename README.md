# Pixel Morph 🎨

**Transform your drawings into stunning images through physics-based particle animation.**

Pixel Morph is an interactive web application where your freehand drawings magically morph into target images using thousands of individually-animated particles. Watch as your sketches come to life with smooth, organic motion powered by physics simulation.

![Demo](https://img.shields.io/badge/demo-live-success) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🖌️ **Intuitive Drawing**
- Freehand drawing with customizable brush size
- Touch support for tablets and mobile devices
- Real-time brush cursor preview
- Keyboard shortcuts for quick actions

### 🎯 **Particle Physics Animation**
- Thousands of particles that morph smoothly from drawing to target image
- Physics-based movement with velocity, acceleration, and friction
- Natural, organic motion with randomized easing
- Variable delay creates staggered, wave-like effects

### 🎨 **Customization Options**
- **Brush Density:** Control how many particles are created per stroke (10-200)
- **Resolution:** Adjust pixel spacing (Ultra to Draft - affects performance vs detail)
- **Color Presets:** Choose from predefined color palettes
- **Custom Color:** Pick any color for your drawing

### 🖼️ **Image Upload**
- Upload any image to morph into
- Supports JPG, PNG, and other web-compatible formats
- Automatic pixel sampling at selected resolution

### ⚡ **Smart Features**
- **Random Pixels Mode:** Randomize particle colors for artistic effects
- **Cycle Colors:** Automatically cycle through a color palette
- **Download Canvas:** Save your morphed artwork as an image
- **Auto-Morph:** Particles begin transforming 3 seconds after drawing

### ⌨️ **Keyboard Shortcuts**
| Key | Action |
|-----|--------|
| `C` | Clear canvas |
| `D` | Download image |
| `H` | Toggle help dialog |
| `Esc` | Close help dialog |

## 🚀 Getting Started

### Option 1: Open Directly
No installation required! Simply open `index.html` in a modern web browser:

```bash
# Clone the repository
git clone https://github.com/luinbytes/pixel-morph.git

# Open in your browser
open pixel-morph/index.html
```

### Option 2: Local Server (Recommended)
For best performance, serve the files via a local HTTP server:

```bash
# Using Python 3
cd pixel-morph
python3 -m http.server 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

## 📖 How to Use

### Basic Workflow
1. **Draw freely** on the canvas with your mouse or touch device
2. **Wait 3 seconds** after drawing - particles will automatically begin morphing
3. **Watch** as your drawing transforms into the target image (default: Obama)
4. **Experiment** with different settings and upload your own images

### Upload Custom Image
1. Click the **Upload Image** button
2. Select any image from your computer (JPG, PNG, etc.)
3. The image will be sampled according to your resolution setting
4. Draw on the canvas to see particles morph into your image

### Adjust Quality
- **Ultra (Low pixel spacing):** Maximum detail, slower performance
- **High/Medium:** Good balance of quality and speed
- **Draft:** Fastest performance, lower detail

### Create Artistic Effects
- Enable **Random Pixels** for colorful, randomized particle art
- Use **Cycle Colors** for rainbow-like color transitions
- Combine with custom images for unique creative results

## 🎯 Use Cases

- **Creative Expression:** Transform simple sketches into detailed art
- **Visual Effects:** Create particle-based animations and transitions
- **Education:** Teach physics concepts through visual particle simulation
- **Relaxation:** Watch the satisfying morphing animation loop
- **Social Media:** Create unique, eye-catching visual content

## 🧠 How It Works

### Particle System
Each particle in Pixel Morph is an independent entity with:
- Position (x, y) and target position (targetX, targetY)
- Velocity (vx, vy) for physics-based movement
- Color and transparency (rgba)
- Individual delay for staggered animation timing
- Custom easing function for natural motion

### Animation Loop
1. **Drawing Phase:** User draws on canvas, particles are spawned at brush positions
2. **Delay Phase:** 3-second timer allows for complete drawing
3. **Morph Phase:** Particles smoothly animate toward target image pixel positions
4. **Settling Phase:** Particles snap into place when close to target

### Physics Simulation
- **Velocity-based movement:** Particles accelerate toward targets
- **Friction:** Gradual slowdown prevents infinite bouncing
- **Noise injection:** Random movement creates organic, non-linear paths
- **Distance-based easing:** Movement speed adjusts based on proximity to target

### Image Sampling
Target images are sampled on a grid determined by the resolution setting:
- Lower resolution = fewer pixels = larger particles = faster performance
- Higher resolution = more pixels = smaller particles = finer detail
- Each grid cell becomes a particle's target position and color

## 🛠️ Technical Details

### Technologies
- **HTML5 Canvas:** For rendering particles and handling drawing
- **Vanilla JavaScript:** No external dependencies
- **CSS3:** Modern styling with flexbox and transitions

### Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 (not supported - uses modern JS features)

### Performance
- **Optimized for desktop** browsers
- **Touch support** for tablets and mobile
- **Resolution slider** lets you adjust performance vs quality
- **Particle culling** removes off-screen particles from computation

## 📦 File Structure

```
pixel-morph/
├── index.html          # Main application page
├── app.js              # Particle system and logic
├── defaultImage.js     # Default target image data
├── style.css           # Application styling
└── README.md           # This file
```

### Key Files Explained

- **`index.html`**: Main application structure, controls UI, help dialog
- **`app.js`**: Core particle system, event handling, animation loop
- **`defaultImage.js`**: Embedded default image (Obama) as pixel data
- **`style.css`**: Responsive layout, canvas styling, control panel

## 🎨 Customization

### Change Default Image
Edit `defaultImage.js` to replace the embedded image:

```javascript
// Replace with your own pixel data
const defaultImage = {
  width: 400,
  height: 400,
  pixels: [
    // Array of {x, y, r, g, b} objects
  ]
};
```

### Adjust Particle Behavior
In `app.js`, modify the `Particle` class:

```javascript
// Change particle size
this.size = 2; // Increase for larger particles

// Adjust physics
this.ease = 0.02 + Math.random() * 0.05; // Speed toward target
this.friction = 0.85 + Math.random() * 0.1; // Deceleration
```

### Modify Morph Delay
Change the auto-morph timer:

```javascript
// In app.js, search for 3000 (milliseconds)
setTimeout(() => {
  this.startMorph();
}, 3000); // Change to desired delay
```

## 🐛 Troubleshooting

### Particles Not Morphing
- Make sure you've waited at least 3 seconds after drawing
- Check that a target image is loaded (default or uploaded)
- Try refreshing the page

### Performance Issues
- Lower the **Resolution** setting to "Medium" or "Low"
- Reduce **Brush Density** to create fewer particles
- Close other browser tabs to free memory
- Use a modern browser (Chrome/Firefox) for best performance

### Image Upload Not Working
- Ensure the image file is under 5MB (recommended)
- Use JPG or PNG format for best compatibility
- Check browser console for error messages (F12)

### Touch Not Responding
- Ensure your browser supports touch events (Chrome Mobile, Safari iOS)
- Try refreshing the page
- Check that JavaScript is enabled

## 💡 Tips & Tricks

- **Quick Morph:** Draw fast, then upload an image immediately for instant results
- **Color Experiments:** Enable "Random Pixels" with custom images for unique effects
- **Smooth Animations:** Use lower brush density (50-100) for fluid motion
- **Detailed Results:** Increase resolution to "High" or "Ultra" for fine details
- **Creative Combinations:** Upload a logo, draw over it, and watch particles form the design

## 📝 Future Enhancements

Potential features for future versions:
- [ ] Video support (morph into video frames)
- [ ] Export animation as GIF/video
- [ ] Multiple morph targets (cycle between images)
- [ ] Particle shape customization (circles, stars)
- [ ] Gravity and wind effects
- [ ] Audio reactivity (morph to music)

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🙏 Credits

Created as an interactive exploration of particle physics and creative coding.

**Built with:**
- HTML5 Canvas API
- Vanilla JavaScript (ES6+)
- CSS3 Animations

---

**Enjoy transforming your art!** ✨
