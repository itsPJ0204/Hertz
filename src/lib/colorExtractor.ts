export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    // Return h in 0-360, s and l in 0-1
    return [Math.round(h * 360), s, l];
}

export async function getDominantHue(imageUrl: string): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(200); // Default to blue-ish
            
            // Downscale heavily for performance and to act as a low-pass filter (averaging)
            canvas.width = 64;
            canvas.height = 64;
            ctx.drawImage(img, 0, 0, 64, 64);
            
            try {
                const data = ctx.getImageData(0, 0, 64, 64).data;
                let rSum = 0, gSum = 0, bSum = 0, count = 0;
                
                // Sample pixels, skipping completely dark or transparent ones
                for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
                    if (data[i + 3] < 128) continue; // skip transparent
                    
                    const l = (data[i] + data[i+1] + data[i+2]) / 3;
                    if (l < 30 || l > 240) continue; // Skip near black or near white
                    
                    rSum += data[i];
                    gSum += data[i + 1];
                    bSum += data[i + 2];
                    count++;
                }
                
                if (count === 0) return resolve(200);
                
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                
                const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
                
                // If it's completely gray/desaturated, fallback to a cool default or keep it 0 (red)
                if (s < 0.1) return resolve(200); 
                
                resolve(h);
            } catch (e) {
                console.error("Canvas CORS issue or error extracting color:", e);
                resolve(200);
            }
        };
        
        img.onerror = () => resolve(200);
        img.src = imageUrl;
    });
}
