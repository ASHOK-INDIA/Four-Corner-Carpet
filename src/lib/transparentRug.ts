/**
 * Transparent Rug Utility
 * Automatically removes background from carpet/rug images using:
 * 1. Perimeter-seeded Flood Fill on HTML5 Canvas (erases outer background while keeping inner white rug patterns intact)
 * 2. Edge feathering for soft fringing
 * 3. In-memory caching for instant responsiveness
 * 4. Graceful CORS fallback using CSS blend/filter isolation
 */

const transparentCache = new Map<string, string>();

interface RemoveBackgroundOptions {
  tolerance?: number; // 0 to 100, default 35
  feather?: number; // 1 to 10 px, default 4
  sampleCornerOnly?: boolean;
}

/**
 * Checks if color difference is within tolerance
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * Removes background from an image file/URL using perimeter-based flood-fill
 */
export async function makeRugBackgroundTransparent(
  imageSource: string | File,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  const tolerance = options.tolerance ?? 38;
  const feather = options.feather ?? 3;

  // If already cached
  if (typeof imageSource === 'string' && transparentCache.has(imageSource)) {
    return transparentCache.get(imageSource)!;
  }

  // Obtain source URL
  let srcUrl: string;
  if (imageSource instanceof File) {
    srcUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  } else {
    srcUrl = imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // Downscale slightly for processing speed if image is huge
        const maxDim = 1400;
        let targetW = width;
        let targetH = height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            targetW = maxDim;
            targetH = Math.round((height * maxDim) / width);
          } else {
            targetH = maxDim;
            targetW = Math.round((width * maxDim) / height);
          }
        }

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(srcUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        // 1. Sample perimeter border pixels to determine background reference colors
        const sampleCoords = [
          [0, 0], [targetW - 1, 0], [0, targetH - 1], [targetW - 1, targetH - 1],
          [Math.floor(targetW / 2), 0], [Math.floor(targetW / 2), targetH - 1],
          [0, Math.floor(targetH / 2)], [targetW - 1, Math.floor(targetH / 2)],
          [4, 4], [targetW - 5, 4], [4, targetH - 5], [targetW - 5, targetH - 5]
        ];

        let bgR = 0, bgG = 0, bgB = 0, count = 0;
        for (const [x, y] of sampleCoords) {
          if (x >= 0 && x < targetW && y >= 0 && y < targetH) {
            const idx = (y * targetW + x) * 4;
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            count++;
          }
        }
        bgR = Math.round(bgR / count);
        bgG = Math.round(bgG / count);
        bgB = Math.round(bgB / count);

        // 2. Perimeter flood-fill queue (BFS)
        // Visited array to prevent infinite loops: 0 = unvisited, 1 = background, 2 = rug
        const visited = new Uint8Array(targetW * targetH);
        const queue: number[] = [];

        // Push all perimeter border pixels into queue
        for (let x = 0; x < targetW; x++) {
          queue.push(x, 0);
          queue.push(x, targetH - 1);
        }
        for (let y = 1; y < targetH - 1; y++) {
          queue.push(0, y);
          queue.push(targetW - 1, y);
        }

        let head = 0;
        while (head < queue.length) {
          const x = queue[head++];
          const y = queue[head++];
          const pos = y * targetW + x;

          if (visited[pos] !== 0) continue;

          const idx = pos * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Compute color distance to background reference
          const dist = colorDistance(r, g, b, bgR, bgG, bgB);

          // Also check lightness: very bright off-whites / studio backdrops
          const isHighWhite = (r > 238 && g > 238 && b > 238);

          if (dist <= tolerance || (isHighWhite && dist <= tolerance * 1.5)) {
            // Pixel is background
            visited[pos] = 1;
            data[idx + 3] = 0; // Transparent!

            // Add 4-connected neighbors
            if (x > 0 && visited[pos - 1] === 0) queue.push(x - 1, y);
            if (x < targetW - 1 && visited[pos + 1] === 0) queue.push(x + 1, y);
            if (y > 0 && visited[pos - targetW] === 0) queue.push(x, y - 1);
            if (y < targetH - 1 && visited[pos + targetW] === 0) queue.push(x, y + 1);
          } else if (dist <= tolerance + feather * 6) {
            // Soft feathering zone along carpet fringe
            visited[pos] = 1;
            const factor = (dist - tolerance) / (feather * 6);
            data[idx + 3] = Math.min(255, Math.max(0, Math.round(factor * 255)));
          } else {
            // Hit rug border
            visited[pos] = 2;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');

        if (typeof imageSource === 'string') {
          transparentCache.set(imageSource, transparentDataUrl);
        }

        resolve(transparentDataUrl);
      } catch (err) {
        // Cross-origin tainted canvas fallback
        console.warn('Canvas background removal skipped due to CORS, applying fallback:', err);
        resolve(srcUrl);
      }
    };

    img.onerror = () => {
      resolve(srcUrl);
    };

    img.src = srcUrl;
  });
}
