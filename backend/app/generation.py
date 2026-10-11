
import base64
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# Load backend/.env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

client = OpenAI()


def generate_hairstyle(image_bytes: bytes, prompt: str) -> bytes:
    image_file = BytesIO(image_bytes)
    image_file.name = "portrait.png"

    result = client.images.edit(
        model="gpt-image-2",
        image=image_file,
        prompt=prompt,
        size="auto",
        quality="medium",
        output_format="png",
        n=1,
    )

    encoded_image = result.data[0].b64_json

    if not encoded_image:
        raise RuntimeError("No generated image was returned")

    return base64.b64decode(encoded_image)


def generate_hairstyle_masked(
    image_bytes: bytes,
    mask_bytes: bytes,
    prompt: str
) -> bytes:

    image_file = BytesIO(image_bytes)
    image_file.name = "portrait.png"

    mask_file = BytesIO(mask_bytes)
    mask_file.name = "hair_mask.png"

    result = client.images.edit(
        model="gpt-image-2",
        image=image_file,
        mask=mask_file,
        prompt=prompt,
        quality="medium",
        output_format="png",
        n=1,
    )

    encoded = result.data[0].b64_json

    if not encoded:
        raise RuntimeError("No generated image returned")

    return base64.b64decode(encoded)

