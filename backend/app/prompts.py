HAIRSTYLES = {
    "textured_crop": "A modern textured crop haircut.",
    "modern_quiff": "A modern quiff haircut.",
    "side_part": "A classic side-part haircut."
}

VALID_FADE_HEIGHTS = {"low", "mid", "high"}
VALID_TEXTURES = {"natural", "messy", "defined"}
VALID_FRINGE_DIRECTIONS = {"forward", "side", "back"}


def build_prompt(
    style_id: str,
    top_length: float,
    side_length: str,
    fade_height: str,
    texture: str,
    fringe_direction: str,
) -> str:
    if style_id not in HAIRSTYLES:
        raise ValueError("Unsupported hairstyle")

    if fade_height not in VALID_FADE_HEIGHTS:
        raise ValueError("Unsupported fade height")

    if texture not in VALID_TEXTURES:
        raise ValueError("Unsupported texture")

    if fringe_direction not in VALID_FRINGE_DIRECTIONS:
        raise ValueError("Unsupported fringe direction")

    base_style = HAIRSTYLES[style_id]

    return f"""
Edit the provided photograph of a person.

Change ONLY the person's hairstyle.

Base hairstyle:
{base_style}

Haircut specifications:
- Top length: approximately {top_length:.1f} inches
- Side length: approximately guard {side_length}
- Fade height: {fade_height} fade
- Hair texture styling: {texture}
- Fringe direction: swept {fringe_direction}

Hair realism requirements:
- Preserve the person's natural hair color unless explicitly necessary
- Render realistic hair strands and small strand groupings
- Maintain realistic hair density and volume
- Preserve natural lighting and shadows
- Avoid plastic-looking, painted, or overly smooth hair
- Ensure a natural hairline and natural transitions between hair and scalp

Preserve the person's identity and facial features:
- Same eyes, nose, mouth, ears, eyebrows, jawline, and face shape
- Same facial expression and skin tone
- Keep the background, clothing, and lighting unchanged
- Do not add accessories
- Do not modify facial hair

Generate a photorealistic edited portrait.
Do not add text or watermarks.
"""

def add_view_instructions(prompt: str, view: str) -> str:
    view_instructions = {
        "front": """
The photograph shows the FRONT of the person's head.
Preserve facial identity and show the selected hairstyle
from the front.
""",
        "side": """
The photograph shows a SIDE PROFILE of the person's head.
Preserve the original profile, ear, head shape, and camera angle.
Show the selected haircut from the side.
Pay particular attention to the fade height, side length,
and blending into the longer hair on top.
Do not rotate the person's head.
""",
        "back": """
The photograph shows the BACK of the person's head.
Maintain the rear-facing camera angle.
Show the selected haircut from the back.
Pay particular attention to the neckline, taper,
fade height, and overall blending.
Do not invent a visible face or rotate the subject.
Preserve clothing, background, and lighting.
"""
    }

    return prompt + "\n" + view_instructions[view]
