# app.py - Corrected Hugging Face Space
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
import io
from PIL import Image
from rembg import remove
import uvicorn

app = FastAPI()

@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    """
    Remove background from uploaded image and return PNG with alpha.
    CRITICAL: Must return PNG with transparency properly preserved!
    """
    try:
        # Read uploaded file
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # IMPORTANT: Convert to RGB first if needed (rembg requires RGB input)
        if input_image.mode not in ('RGB', 'RGBA'):
            input_image = input_image.convert('RGB')
        
        # Remove background - returns RGBA image
        output_image = remove(input_image)
        
        # CRITICAL: Ensure output is RGBA mode
        if output_image.mode != 'RGBA':
            print(f"WARNING: Output mode is {output_image.mode}, converting to RGBA")
            output_image = output_image.convert('RGBA')
        
        # Convert to bytes - MUST be PNG to preserve alpha
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG', optimize=False)
        img_byte_arr.seek(0)
        
        # Verify the output has transparency
        test_img = Image.open(img_byte_arr)
        img_byte_arr.seek(0)
        
        if test_img.mode != 'RGBA':
            print(f"ERROR: Output image mode is {test_img.mode}, not RGBA!")
        
        print(f"Success: {input_image.size} -> {output_image.size}, mode: {output_image.mode}")
        
        return Response(
            content=img_byte_arr.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": "attachment; filename=output.png"
            }
        )
        
    except Exception as e:
        print(f"Error in background removal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "rembg-u2net"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)