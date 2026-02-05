# ML Background Removal Service

## Overview

Product images are processed using a separate ML service hosted on Hugging Face Spaces. This architecture keeps the Next.js app fast and serverless-friendly while handling compute-intensive ML operations separately.

## Architecture

```
User Upload → Vercel API → HF Space (ML) → Processed Image → Supabase Storage
```

### Why Separate Service?

1. **Vercel Limitations**: 50MB deployment limit, 60s timeout max
2. **ML Model Size**: Background removal models are 50-100MB
3. **Processing Time**: ML inference can take 2-10 seconds
4. **Cost**: HF Spaces offers unlimited free CPU inference

## Deployment

### Step 1: Deploy ML Service to Hugging Face

1. Create new repo: `rdk-background-removal-service`
2. Add these files:
   - `app.py` (FastAPI service)
   - `requirements.txt`
   - `Dockerfile`
   - `README.md`

3. Create HF Space at https://huggingface.co/new-space
   - Name: `rdk-background-removal`
   - SDK: Docker
   - Connect to your GitHub repo for auto-deploy

4. Copy your Space URL: `https://USERNAME-rdk-background-removal.hf.space`

### Step 2: Configure Vercel

Add environment variable in Vercel dashboard:
```bash
HF_SPACE_URL=https://USERNAME-rdk-background-removal.hf.space
```

### Step 3: Update Dependencies

Remove from `package.json`:
```json
"@imgly/background-removal-node": "^1.x.x"
```

Run:
```bash
npm install
```

### Step 4: Deploy to Vercel

```bash
git add .
git commit -m "Migrate ML processing to HF Spaces"
git push origin main
```

Vercel auto-deploys from main branch.

## API Integration

### How It Works

1. User uploads image to Vercel API route: `/api/admin/uploads/product-image`
2. Vercel sends image to HF Space: `POST /remove-background`
3. HF Space removes background using rembg (u2net model)
4. Returns PNG with alpha channel
5. Vercel processes result (centers, adds padding, converts to WebP)
6. Uploads to Supabase storage

### Request Flow

```typescript
// In ProductImageService
const cutoutPng = await callHFBackgroundRemoval(normalizedPng);

async function callHFBackgroundRemoval(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/png" });
  formData.append("file", blob, "image.png");

  const response = await fetch(`${HF_SPACE_URL}/remove-background`, {
    method: "POST",
    body: formData,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

## Processing Strategies

The service uses three strategies:

### 1. `ml_subject_centered_uniform`
- Detected: Studio background (solid color)
- Action: Solid padding + centered cutout
- Example: White background product photos

### 2. `ml_subject_centered_scene`
- Detected: Natural/complex background
- Action: Reframe original background + composite centered cutout
- Example: Shoe on floor/grass/shelf

### 3. `fallback_cover_center`
- Triggered: ML fails or no subject detected
- Action: Simple center crop (no ML)
- Flags: `needsReview: true`

## Quality Metrics

### Quality Score (0-100)
- **90-100**: High resolution (>2000px)
- **80-89**: Good resolution (800-2000px)
- **70-79**: Acceptable resolution (600-800px)
- **<70**: Low resolution (<600px) - flagged for review

### Review Flags
Images flagged when:
- Quality score < 70
- Processing strategy = fallback
- ML segmentation hints: `mask_too_small`, `mask_too_large`

## Monitoring

### HF Space Logs
View at: `https://huggingface.co/spaces/USERNAME/rdk-background-removal/logs`

### Vercel Logs
```bash
vercel logs --follow
```

### Common Issues

**Timeout errors**:
- HF Space cold start can take 30-60s first time
- Solution: Keep space "warm" with health check cron

**Low quality outputs**:
- Check original image resolution
- Review `needsReview` flagged images
- Tune `margin` parameter in `squareFromBounds()` (default: 1.28)

**ML segmentation fails**:
- Verify HF Space is running: `GET /health`
- Check `HF_SPACE_URL` env var is set
- Fallback strategy activates automatically

## Performance

### Typical Processing Times

| Stage | Time |
|-------|------|
| Upload to Vercel | <1s |
| ML Background Removal (HF) | 2-5s (CPU), <1s (GPU) |
| Image Processing (Sharp) | 0.5-1s |
| Upload to Supabase | <1s |
| **Total** | **3-7s** |

### Cost (Free Tier)

- **Vercel**: Included in hobby plan
- **HF Spaces**: Unlimited CPU inference (free)
- **Supabase**: 1GB storage (free tier)

**At scale**: ~1000 images/day = still free on HF CPU

## Development

### Local Testing

1. Run HF Space locally:
```bash
cd rdk-background-removal-service
docker build -t bg-removal .
docker run -p 7860:7860 bg-removal
```

2. Update `.env.local`:
```bash
HF_SPACE_URL=http://localhost:7860
```

3. Test endpoint:
```bash
curl -X POST http://localhost:7860/remove-background \
  -F "file=@test-shoe.jpg" \
  -o output.png
```

### Debugging

Enable verbose logging in `product-image-service.ts`:
```typescript
console.info("[ML] Calling HF Space:", HF_SPACE_URL);
console.info("[ML] Response status:", response.status);
```

## Security

### Public vs Private Space

**Current**: Public space (anyone can call)
**Production**: Make private + add auth token

To add auth:
1. Make HF Space private
2. Generate token at https://huggingface.co/settings/tokens
3. Add to Vercel env: `HF_SPACE_TOKEN=hf_xxxxx`
4. Update fetch call:
```typescript
const response = await fetch(`${HF_SPACE_URL}/remove-background`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.HF_SPACE_TOKEN}`
  },
  body: formData,
});
```

## Alternatives

If you outgrow HF Spaces:

1. **Modal** - $30/month free credits, then $0.0001/request
2. **Replicate** - Managed ML inference, pay-per-use
3. **Railway** - $5/month, deploy as Node.js service
4. **AWS Lambda** - Custom container runtime (complex)

## Support

- HF Spaces docs: https://huggingface.co/docs/hub/spaces
- rembg library: https://github.com/danielgatis/rembg
- Sharp docs: https://sharp.pixelplumbing.com/

## Changelog

### 2026-02-04
- Initial deployment to HF Spaces
- Replaced local worker pattern
- Removed 50MB `@imgly/background-removal-node` dependency
- Fixed scene background compositing bug