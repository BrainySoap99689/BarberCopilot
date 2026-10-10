
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from fastapi import Form
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from PIL import ImageOps
from .generation import generate_hairstyle
from .prompts import build_prompt
from .vision import analyze_face

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "BarberCopilot API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_photo(file: UploadFile = File(...)):
    # Read the uploaded image
    contents = await file.read()

    # Limit file size to 8 MB
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large"
        )

    try:
        image = Image.open(BytesIO(contents))
        image.verify()

        image = Image.open(BytesIO(contents))
        width, height = image.size

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    return {
        "message": "Photo uploaded successfully",
        "filename": file.filename,
        "width": width,
        "height": height
    }

@app.post("/api/generate")
async def generate(
    file: UploadFile = File(...),
    style: str = Form(...)
):
    try:
        prompt = build_prompt(style)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid hairstyle selected"
        )

    if file.content_type not in (
        "image/jpeg", "image/png", "image/webp"
    ):
        raise HTTPException(
            status_code=400,
            detail="Upload a JPEG, PNG, or WebP image"
        )

    contents = await file.read()

    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large"
        )

    try:
        original = Image.open(BytesIO(contents))
        original = ImageOps.exif_transpose(original)
        original.thumbnail((1536, 1536))

        normalized = BytesIO()
        original.convert("RGB").save(
            normalized, format="PNG"
        )
        image_bytes = normalized.getvalue()

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    try:
        generated_bytes = await run_in_threadpool(
            generate_hairstyle,
            image_bytes,
            prompt
        )

    except Exception:
        # Log details server-side without exposing secrets
        import logging
        logging.exception("Image generation failed")

        raise HTTPException(
            status_code=502,
            detail="Image generation failed. Check backend logs."
        )

    return Response(
        content=generated_bytes,
        media_type="image/png"
    )

@app.post("/api/analyze")
async def analyze_photo(file: UploadFile = File(...)):
    if file.content_type not in (
        "image/jpeg", "image/png", "image/webp"
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WebP image."
        )

    contents = await file.read()

    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large."
        )

    try:
        image = Image.open(BytesIO(contents))
        if image.width * image.height > 20_000_000:
            raise HTTPException(
                status_code=413,
                detail="Image dimensions are too large."
            )

        result = await run_in_threadpool(
            analyze_face, image
        )
        return result

    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image."
        )
