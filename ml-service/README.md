---
title: Background Removal API
emoji: 🎨
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Background Removal Service

Simple API for removing backgrounds from product images using rembg.

## API Endpoints

### `POST /remove-background`
Remove background from an uploaded image.

**Request:**
```bash
curl -X POST https://YOUR-SPACE-URL.hf.space/remove-background \
  -F "file=@image.jpg" \
  -o output.png
```

**Response:** PNG image with transparent background

### `GET /health`
Health check endpoint.

**Response:**
```json
{"status": "healthy"}
```

## Model

Uses `rembg` with the u2net model for background removal.

## Usage

This service is designed to be called from the RDK webstore backend for automated product image processing.