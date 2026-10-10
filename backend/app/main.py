
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError
from io import BytesIO

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
