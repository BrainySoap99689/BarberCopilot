from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from .hair_segmentation import get_hair_mask_array
from .vision import analyze_face

# MediaPipe face oval indices
FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109
]

def build_edit_mask(
    image: Image.Image,
    top_expand_px: int = 60,
    side_expand_px: int = 35,
    blur_ksize: int = 31
):
    rgb, hair_mask = get_hair_mask_array(image, threshold=0.35)

    pil_image = Image.fromarray(rgb)
    face_result = analyze_face(pil_image)

    if not face_result["face_detected"] or not face_result["landmarks"]:
        raise RuntimeError("No usable face detected for edit mask")

    h, w = hair_mask.shape

    # 1) expand the mask
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (side_expand_px, side_expand_px)
    )
    expanded = cv2.dilate(hair_mask, kernel, iterations=1)

    # 2) add extra upward expansion for styles like quiff
    shifted_up = np.zeros_like(expanded)
    if top_expand_px < h:
        shifted_up[:-top_expand_px, :] = expanded[top_expand_px:, :]
        expanded = np.maximum(expanded, shifted_up)

    # 3) protect face using face oval polygon
    face_points = []
    for idx in FACE_OVAL:
        if idx < len(face_result["landmarks"]):
            pt = face_result["landmarks"][idx]
            face_points.append([pt["x"], pt["y"]])

    protected_face = np.zeros((h, w), dtype=np.uint8)
    if len(face_points) >= 3:
        pts = np.array(face_points, dtype=np.int32)
        cv2.fillConvexPoly(protected_face, pts, 255)

    # subtract protected face region from edit area
    edit_mask = expanded.copy()
    edit_mask[protected_face > 0] = 0

    # 4) keep mask in upper face / hair area only
    if face_result.get("face_bounding_box"):
        box = face_result["face_bounding_box"]
        y_limit = min(h, box["y"] + box["height"] // 2)
        edit_mask[y_limit:, :] = 0

    # 5) feather mask edges
    feather = (edit_mask * 255).astype(np.uint8)
    if blur_ksize % 2 == 0:
        blur_ksize += 1
    feather = cv2.GaussianBlur(feather, (blur_ksize, blur_ksize), 0)

    # binary preview
    preview_binary = (edit_mask * 255).astype(np.uint8)
    preview_binary_rgb = np.stack(
        [preview_binary, preview_binary, preview_binary],
        axis=-1
    )

    # overlay preview
    overlay = rgb.copy()
    color = np.zeros_like(rgb)
    color[:] = [255, 0, 255]  # magenta

    alpha = 0.35
    overlay = np.where(
        edit_mask[..., None] == 1,
        ((1 - alpha) * rgb + alpha * color).astype(np.uint8),
        rgb
    )

    # final mask image for APIs that expect white editable region
    final_mask_image = Image.fromarray(feather).convert("L")

    return {
        "rgb": rgb,
        "edit_mask_binary": preview_binary_rgb,
        "overlay": overlay,
        "final_mask_pil": final_mask_image,
        "face_result": face_result
    }


def pil_image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def create_api_mask(final_mask_pil: Image.Image) -> bytes:
    """
    Convert white-edit / black-protect grayscale mask
    to an RGBA PNG mask.

    Transparent = editable
    Opaque = protected
    """

    grayscale = np.array(
        final_mask_pil.convert("L"),
        dtype=np.uint8
    )

    # Invert grayscale to alpha
    alpha = 255 - grayscale

    rgba = np.full(
        (grayscale.shape[0], grayscale.shape[1], 4),
        255,
        dtype=np.uint8
    )

    rgba[:, :, 3] = alpha

    mask_image = Image.fromarray(rgba, mode="RGBA")

    buffer = BytesIO()
    mask_image.save(buffer, format="PNG")

    return buffer.getvalue()
