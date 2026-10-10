
HAIRSTYLES = {
    "textured_crop": (
        "A modern textured crop haircut with a short, "
        "naturally textured top, a slightly forward fringe, "
        "and neatly tapered sides."
    ),
    "modern_quiff": (
        "A modern quiff haircut with voluminous hair "
        "swept upward and backward at the front, "
        "with shorter tapered sides."
    ),
    "side_part": (
        "A classic side-part haircut with a clean, "
        "natural parting, neatly combed medium-length "
        "hair on top, and tapered sides."
    ),
}

HAIR_TEXTURE_INSTRUCTIONS = """
Hair realism requirements:
- Preserve the person's natural hair color and
  underlying hair texture unless explicitly changed.
- Render individual hair strands and small groups
  of strands with realistic variation.
- Include natural flyaway hairs and subtle
  irregularities rather than a perfectly sculpted shape.
- Maintain realistic density and volume.
- Make hair follow natural growth directions.
- Ensure realistic transitions between longer hair,
  shorter hair, and the scalp.
- Preserve natural highlights, shadows, and
  lighting consistent with the original photograph.
- Avoid plastic-looking, painted, overly smooth,
  or artificially uniform hair.
- Avoid unnatural sharp boundaries around the hairline.
"""


def build_prompt(style_id: str) -> str:
    if style_id not in HAIRSTYLES:
        raise ValueError("Unsupported hairstyle")

    hairstyle = HAIRSTYLES[style_id]

    return f"""
Edit the provided photograph of a person.

Change ONLY the person's hairstyle to:
{hairstyle}

Preserve the person's identity and facial features:
- Same eyes, nose, mouth, ears, eyebrows, and jawline
- Same facial expression and skin tone
- Same face shape and head position
- Preserve natural hair color
- Keep clothing and background unchanged
- Preserve camera angle and lighting

{HAIR_TEXTURE_INSTRUCTIONS}

Generate a photorealistic edited portrait.
Do not add text, watermarks, or accessories.
"""
