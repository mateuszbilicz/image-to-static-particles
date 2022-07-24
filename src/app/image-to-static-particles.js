export class ImageToStaticParticles {
    // START CONFIG
    bgColor = 'rgba(0, 0, 0, 0)';
    density = 10;
    particleDots = true;
    particleDotsSize = 2;
    particleConnections = true;
    particleConnectionDistance = 30;
    particleConnectionLimit = 3;
    particleConnectionMixColors = true;
    particleConnectionLineWidth = 1;
    particleConnectionCustomFunction = null; // args: (ctx, pixels[{x,y,color}, ...], w, h, canvas) returns: [{type: 'line', pixel1, pixel2, color<string>}]
    particleConnectionsByDistance = true; // otherwise, will randomize
    oncomplete = null;
    onstatechange = null;
    randomizePositions = 0;
    // END CONFIG
    canvas = null;
    ctx = null;
    img = null;
    percentSize = 0;
    currentPercent = 0;
    currentStep = 0;
    originalRenderQueueSize = 0;
    pixels = [];
    renderQueue = [];
    renderAnimationFrame = 0;
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    addDots() {
        this.pixels.forEach(pixel => {
            if (pixel.color === 'rgba(0,0,0,0)') return;
            this.renderQueue.push({
                type: 'dot',
                pixel: pixel
            });
        });
    }
    connect2Dots(pixel1Index, pixel2Index) {
        let pixel1 = this.pixels[pixel1Index],
            pixel2 = this.pixels[pixel2Index],
            color = pixel1.color;
        if (this.particleConnectionMixColors) {
            let rgbaOfPixel1 = [...pixel1.color.matchAll(RegExp(/\d+/g))],
                rgbaOfPixel2  = [...pixel2.color.matchAll(RegExp(/\d+/g))],
                r = rgbaOfPixel1[0] * 0.5 + rgbaOfPixel2[0] * 0.5,
                g = rgbaOfPixel1[1] * 0.5 + rgbaOfPixel2[1] * 0.5,
                b = rgbaOfPixel1[2] * 0.5 + rgbaOfPixel2[2] * 0.5,
                a = rgbaOfPixel1[3] * 0.5 + rgbaOfPixel2[3] * 0.5;
            color = `rgba(${r},${g},${b},${a})`;
        }
        this.renderQueue.push({
            type: 'line',
            pixel1: pixel1,
            pixel2: pixel2,
            color: color
        });
    }
    addConnections() {
        if (this.particleConnectionCustomFunction) {
            return this.renderQueue.push(...this.particleConnectionCustomFunction(this.ctx, this.pixels, this.canvas.width, this.canvas.height, this.canvas));
        }

        let currentIndex = this.pixels.length,  randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [this.pixels[currentIndex], this.pixels[randomIndex]] = [this.pixels[randomIndex], this.pixels[currentIndex]];
        }

        this.pixels.forEach((pixel, index) => {
            if (!pixel.hasOwnProperty('connections')) {
                this.pixels[index].connections = 0;
                this.pixels[index].nearPixels = [];
                this.pixels[index].connectedTo = new Map();
            }
            this.pixels.forEach((pixel2, index2) => {
                let x = pixel2.x - pixel.x,
                    y = pixel2.y - pixel.y,
                    distance = Math.sqrt(x * x + y * y);
                if (distance <= this.particleConnectionDistance) {
                    this.pixels[index].nearPixels.push({distance: distance, index: index2});
                }
            });
        });

        if (this.particleConnectionsByDistance) {
            this.pixels.forEach((pixel, index) => {
                this.pixels[index].nearPixels = this.pixels[index].nearPixels.sort((nearPixel1, nearPixel2) => {
                    return nearPixel2.distance - nearPixel1.distance;
                });
            });
        } else {
            this.pixels.forEach((pixel, index) => {
                let currentIndex = this.pixels[index].nearPixels.length,  randomIndex;
                while (currentIndex != 0) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex--;
                    [this.pixels[index].nearPixels[currentIndex], this.pixels[index].nearPixels[randomIndex]] = [this.pixels[index].nearPixels[randomIndex], this.pixels[index].nearPixels[currentIndex]];
                }
            });
        }
        this.ctx.lineWidth = this.particleConnectionLineWidth;
        this.pixels.forEach((pixel, index) => {
            // connections:number
            // nearPixels:array<{distance,index}>
            // connectedTo:map
            if (pixel.connections === this.particleConnectionLimit) return;
            pixel.nearPixels.forEach((nearPixel, nearPixelIndex) => {
                if (this.pixels[nearPixel.index].connections === this.particleConnectionLimit
                    || this.pixels[nearPixel.index].connectedTo.has(index) || pixel.connectedTo.has(nearPixel.index)) return;
                this.pixels[index].connectedTo.set(nearPixel.index, true);
                this.pixels[nearPixel.index].connectedTo.set(index, true);
                this.connect2Dots(index, nearPixel.index);
                this.pixels[index].connections++;
                this.pixels[nearPixel.index].connections++;
            });
            delete this.pixels[index].nearPixels;
        });
    }
    render(imageBase64) {
        this.img = new Image();
        this.pixels = [];
        if (this.renderAnimationFrame) {
            cancelAnimationFrame(this.renderAnimationFrame);
            this.renderQueue = [];
        }
        this.img.onload = () => {
            this.canvas.style.width = this.img.naturalWidth + 'px';
            this.canvas.style.height = this.img.naturalHeight + 'px';
            this.canvas.width = this.ctx.width = this.img.naturalWidth;
            this.canvas.height = this.ctx.height = this.img.naturalHeight;
            this.ctx.drawImage(this.img, 0, 0, this.img.naturalWidth, this.img.naturalHeight);
            this.currentStep = 0;
            this.currentPercent = 0;
            this.percentSize = 1;
            requestAnimationFrame(() => {
                this.drawFrame();
            });
        }
        this.img.src = imageBase64;
    }
    updateProgress() {
        this.currentPercent = this.percentSize * (this.originalRenderQueueSize - this.renderQueue.length);
        if (this.onstatechange) {
            this.onstatechange(this.currentPercent, this.currentStep, this.renderQueue.length);
        }
        if (this.currentPercent === 100 && this.oncomplete) {
            this.oncomplete();
        }
    }
    drawFrame() {
        if (this.currentStep !== 4) {
            switch(this.currentStep) {
                case 0: {
                    let colors = [...this.ctx.getImageData(0, 0, this.img.naturalWidth, this.img.naturalHeight).data];
                    this.ctx.clearRect(0, 0, this.img.naturalWidth, this.img.naturalHeight);
                    this.fillStyle = this.bgColor;
                    this.ctx.fillRect(0, 0, this.img.naturalWidth, this.img.naturalHeight);
                    let px = 0, py = 0;
                    while (py <= this.img.naturalHeight) {
                        px = 0;
                        while (px <= this.img.naturalWidth) {
                            let pixelPos = (px + py * this.img.naturalWidth) * 4,
                                color = `rgba(${colors[pixelPos]},${colors[pixelPos + 1]},${colors[pixelPos + 2]},${colors[pixelPos + 3]})`;
                            this.pixels.push({
                                x: px + Math.random() * this.randomizePositions - this.randomizePositions / 2,
                                y: py + Math.random() * this.randomizePositions - this.randomizePositions / 2,
                                color: color
                            });
                            px += this.density;
                        }
                        py += this.density;
                    }
                } break;
                case 1: {
                    if (this.particleDots) {
                        this.addDots();
                    }
                } break;
                case 2: {
                    if (this.particleConnections) {
                        this.addConnections();
                    }
                    this.percentSize = 100 / this.renderQueue.length;
                    this.currentPercent = 0;
                    this.originalRenderQueueSize = this.renderQueue.length;
                } break;
            }
            this.updateProgress();
            this.currentStep++;
            this.renderAnimationFrame = requestAnimationFrame(() => {
                this.drawFrame();
            });
            return;
        }
        let nextAmount = Math.min(100, this.renderQueue.length);
        for (let i = 0; i < nextAmount; i++) {
            let elemToDraw = this.renderQueue[i];
            if (elemToDraw.type === 'dot') {
                this.ctx.beginPath();
                this.ctx.arc(elemToDraw.pixel.x, elemToDraw.pixel.y, this.particleDotsSize, 0, 2*Math.PI);
                this.ctx.fillStyle = elemToDraw.pixel.color
                this.ctx.fill();
            } else {
                this.ctx.strokeStyle = elemToDraw.color;
                this.ctx.beginPath();
                this.ctx.moveTo(elemToDraw.pixel1.x, elemToDraw.pixel1.y);
                this.ctx.lineTo(elemToDraw.pixel2.x, elemToDraw.pixel2.y);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
        this.renderQueue.splice(0, nextAmount);
        this.updateProgress();
        if (this.renderQueue.length > 0) {
            this.renderAnimationFrame = requestAnimationFrame(() => {
                this.drawFrame();
            });
        }
    }
}
