
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
from .hair_segmentation import segment_hair
from .editing_mask import build_edit_mask, pil_image_to_png_bytes
import base64
from .editing_mask import build_edit_mask, create_api_mask
from .generation import generate_hairstyle_masked
from .prompts import build_prompt, add_view_instructions

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
    style: str = Form(...),
    mode: str = Form("standard"),
    top_length: float = Form(...),
    side_length: str = Form(...),
    fade_height: str = Form(...),
    texture: str = Form(...),
    fringe_direction: str = Form(...),
    view: str = Form("front")
):
    if view not in {"front", "side", "back"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid camera angle"
        )
    if mode not in ("standard", "masked"):
        raise HTTPException(
            status_code=400,
            detail="Invalid generation mode"
        )

    try:
        prompt = build_prompt(
                style_id=style,
                top_length=top_length,
                side_length=side_length,
                fade_height=fade_height,
                texture=texture,
                fringe_direction=fringe_direction,
        )
        prompt = add_view_instructions(prompt, view)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid hairstyle"
        )

    if file.content_type not in (
        "image/jpeg", "image/png", "image/webp"
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid image type"
        )

    contents = await file.read()

    if not contents or len(contents) > 8 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be between 1 byte and 8 MB"
        )

    try:
        image = Image.open(BytesIO(contents))
        image = ImageOps.exif_transpose(image)

        if image.width * image.height > 20_000_000:
            raise HTTPException(
                status_code=413,
                detail="Image dimensions are too large"
            )

        image = image.convert("RGB")
        image.thumbnail((1280, 1280))

        if mode == "masked" and view == "front":
            # Generate an editing mask from the same
            # normalized image used for generation.
            mask_result = await run_in_threadpool(
                build_edit_mask, image.copy()
            )

            normalized_image = Image.fromarray(
                mask_result["rgb"]
            )

            mask_bytes = create_api_mask(
                mask_result["final_mask_pil"]
            )

            # Validate matching dimensions and PNG size
            with Image.open(BytesIO(mask_bytes)) as mask_image:
                if mask_image.size != normalized_image.size:
                    raise RuntimeError(
                        "Mask and image dimensions do not match"
                    )

            if len(mask_bytes) >= 4 * 1024 * 1024:
                raise RuntimeError("Mask exceeds 4 MB")

        else:
            normalized_image = image

        buffer = BytesIO()
        normalized_image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()

    except HTTPException:
        raise
    except (OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid input image"
        )

    try:
        if mode == "masked" and view == "front":
            generated_bytes = await run_in_threadpool(
                generate_hairstyle_masked,
                image_bytes,
                mask_bytes,
                prompt
            )
        else:
            generated_bytes = await run_in_threadpool(
                generate_hairstyle,
                image_bytes,
                prompt
            )

    except Exception:
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
@app.post("/api/segment-hair")
async def segment_hair_endpoint(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
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

        result = await run_in_threadpool(
            segment_hair,
            image
        )
        return result

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image."
        )
    except Exception:
        import logging
        logging.exception("Hair segmentation failed")
        raise HTTPException(
            status_code=500,
            detail="Hair segmentation failed."
        )
@app.post("/api/debug-edit-mask")
async def debug_edit_mask(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
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

        result = await run_in_threadpool(build_edit_mask, image)

        overlay_b64 = base64.b64encode(
            pil_image_to_png_bytes(Image.fromarray(result["overlay"]))
        ).decode("utf-8")

        binary_b64 = base64.b64encode(
            pil_image_to_png_bytes(Image.fromarray(result["edit_mask_binary"]))
        ).decode("utf-8")

        final_mask_b64 = base64.b64encode(
            pil_image_to_png_bytes(result["final_mask_pil"])
        ).decode("utf-8")

        return {
            "overlay_b64": overlay_b64,
            "binary_b64": binary_b64,
            "final_mask_b64": final_mask_b64,
        }

    except Exception:
        import logging
        logging.exception("Edit mask generation failed")
        raise HTTPException(
            status_code=500,
            detail="Edit mask generation failed."
        )