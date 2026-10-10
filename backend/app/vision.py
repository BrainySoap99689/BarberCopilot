
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image, ImageOps


MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models"
    / "face_landmarker.task"
)


def analyze_face(image: Image.Image) -> dict:
    # Correct orientation and convert to RGB
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((1280, 1280))

    pixels = np.ascontiguousarray(
        np.array(image, dtype=np.uint8)
    )

    height, width = pixels.shape[:2]

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=pixels
    )

    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(
            model_asset_path=str(MODEL_PATH)
        ),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=2
    )

    with mp.tasks.vision.FaceLandmarker.create_from_options(
        options
    ) as landmarker:
        result = landmarker.detect(mp_image)

    faces = result.face_landmarks
    face_count = len(faces)

    warnings = []

    if face_count == 0:
        return {
            "face_detected": False,
            "face_count": 0,
            "landmarks": [],
            "warnings": ["No face detected."],
            "usable": False
        }

    if face_count > 1:
        warnings.append(
            "Multiple faces detected. Upload a solo portrait."
        )

    landmarks = faces[0]

    # Convert normalized landmark coordinates to pixel positions
    points = [
        {
            "x": round(p.x * width),
            "y": round(p.y * height)
        }
        for p in landmarks
    ]

    # Bounding rectangle around face landmarks
    xs = [p["x"] for p in points]
    ys = [p["y"] for p in points]

    box_width = max(xs) - min(xs)
    box_height = max(ys) - min(ys)

    face_ratio = box_width / width

    if face_ratio < 0.20:
        warnings.append(
            "Move closer to the camera. Your face is quite small."
        )

    # Basic image sharpness estimate using OpenCV
    gray = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY)

    sharpness = cv2.Laplacian(
        gray, cv2.CV_64F
    ).var()

    if sharpness < 50:
        warnings.append(
            "This image may be blurry."
        )

    brightness = float(np.mean(gray))

    if brightness < 55:
        warnings.append(
            "This image may be too dark."
        )

    return {
        "face_detected": True,
        "face_count": face_count,
        "landmarks": points,
        "image_width": width,
        "image_height": height,
        "face_bounding_box": {
            "x": min(xs),
            "y": min(ys),
            "width": box_width,
            "height": box_height
        },
        "sharpness": round(float(sharpness), 2),
        "brightness": round(brightness, 2),
        "warnings": warnings,
        "usable": face_count == 1
    }
