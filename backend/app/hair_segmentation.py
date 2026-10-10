import base64
from io import BytesIO
import cv2
import mediapipe as mp
import numpy as np
from PIL import Image, ImageOps
from pathlib import Path

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models"
    / "hair_segmenter.tflite"
)


def _encode_png(rgb_array: np.ndarray) -> str:
    image = Image.fromarray(rgb_array)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def segment_hair(image: Image.Image) -> dict:
    # Normalize image
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((1280, 1280))

    rgb = np.array(image)
    
    # Convert NumPy RGB image into a MediaPipe image
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=np.ascontiguousarray(rgb)
    )

    options = mp.tasks.vision.ImageSegmenterOptions(
        base_options=mp.tasks.BaseOptions(
            model_asset_path=str(MODEL_PATH)
        ),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        output_category_mask=False,
        output_confidence_masks=True,
    )

    with mp.tasks.vision.ImageSegmenter.create_from_options(
        options
    ) as segmenter:
        results = segmenter.segment(mp_image)

    # Confidence channel 1 represents hair.
    if not results.confidence_masks or len(results.confidence_masks) < 2:
        raise RuntimeError("Hair confidence mask was not returned")

    hair_mask = results.confidence_masks[1].numpy_view().copy()


    # Resize to original image size if needed
    hair_mask = cv2.resize(
        hair_mask,
        (rgb.shape[1], rgb.shape[0]),
        interpolation=cv2.INTER_LINEAR,
    )

    # Smooth mask slightly
    hair_mask = cv2.GaussianBlur(hair_mask, (7, 7), 0)

    # Convert to binary mask
    threshold = 0.35
    binary_mask = (hair_mask > threshold).astype(np.uint8)

    hair_pixels = int(binary_mask.sum())
    total_pixels = int(binary_mask.shape[0] * binary_mask.shape[1])
    coverage_pct = round(100.0 * hair_pixels / total_pixels, 2)

    # White-on-black mask image
    mask_gray = (binary_mask * 255).astype(np.uint8)
    mask_rgb = np.stack([mask_gray, mask_gray, mask_gray], axis=-1)

    # Create colored overlay
    overlay_color = np.zeros_like(rgb)
    overlay_color[:] = [0, 255, 255]  # cyan

    alpha = 0.40
    overlay = rgb.copy()
    overlay = np.where(
        binary_mask[..., None] == 1,
        ((1 - alpha) * rgb + alpha * overlay_color).astype(np.uint8),
        rgb,
    )

    # Hair bounding box
    ys, xs = np.where(binary_mask == 1)
    hair_bounding_box = None

    if len(xs) > 0 and len(ys) > 0:
        x_min, x_max = int(xs.min()), int(xs.max())
        y_min, y_max = int(ys.min()), int(ys.max())

        hair_bounding_box = {
            "x": x_min,
            "y": y_min,
            "width": x_max - x_min,
            "height": y_max - y_min,
        }

    warnings = []
    if hair_pixels == 0:
        warnings.append("No hair region detected.")
    elif coverage_pct < 1.0:
        warnings.append("Very little hair detected.")
    elif coverage_pct > 35.0:
        warnings.append("Hair mask may be too large or bleeding into background.")

    return {
        "image_width": int(rgb.shape[1]),
        "image_height": int(rgb.shape[0]),
        "hair_pixels": hair_pixels,
        "coverage_pct": coverage_pct,
        "threshold": threshold,
        "hair_bounding_box": hair_bounding_box,
        "warnings": warnings,
        "mask_b64": _encode_png(mask_rgb),
        "overlay_b64": _encode_png(overlay),
    }