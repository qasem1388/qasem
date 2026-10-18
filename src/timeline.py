"""Single source of truth for timing. Video (render.py) and audio (audio.py) both read it,
so moving a beat here keeps picture, sound effects and voice-over in sync."""

FPS = 30
DURATION = 30.0
W, H = 1080, 1920

# Text safe area that works for Snapchat, Instagram Reels and Stories at the same time
# (Reels needs the most room: ~14% top and ~35% bottom kept free of text).
SAFE_TOP = 270
SAFE_BOTTOM = 1250
SAFE_SIDE = 80

SCENES = [  # (name, start, end)
    ("s1_hook", 0.0, 3.0),
    ("s2_details", 3.0, 9.0),
    ("s3_water", 9.0, 16.0),
    ("s4_lifestyle", 16.0, 23.0),
    ("s5_hero", 23.0, 30.0),
]
TRANSITION = 0.4  # seconds of the gold light-dip between scenes

# Scene-internal beats (seconds, absolute)
FLASH_AT = 0.22
S1_LINE1_AT = 0.45
S1_LINE2_AT = 1.25
S2_SHOT_B = 6.0
S2_BRAND_AT = 3.5
S2_TAGLINE_AT = 6.3
S3_TEXT_AT = 9.9
S3_SHIELD_AT = 12.2
S3_DROPS = [9.45, 9.85, 10.2, 10.7, 11.05, 11.5, 13.3, 14.1]  # droplet lands on the glass
S4_BEATS = [16.0, 18.4, 20.6]
S5_BRAND_AT = 23.6
S5_TAGLINE_AT = 24.6
S5_STORE_AT = 25.9
S5_CTA_AT = 26.7

# Sound-effect cue sheet (time, kind, gain)
SFX = [
    (0.00, "pulse", 1.0),
    (FLASH_AT, "impact", 1.0),
    (2.75, "whoosh", 0.8),
    (S2_BRAND_AT, "shimmer", 0.7),
    (5.75, "whoosh", 0.6),
    (6.4, "shimmer", 0.5),
    (8.75, "whoosh", 0.7),
    *[(t, "drop", 0.75) for t in S3_DROPS],
    (S3_SHIELD_AT, "bass_hit", 1.0),
    (15.75, "whoosh", 0.7),
    (18.2, "whoosh", 0.45),
    (20.4, "whoosh", 0.45),
    (20.6, "shimmer", 0.45),
    (22.75, "whoosh", 0.8),
    (23.0, "impact", 0.85),
    (S5_BRAND_AT, "shimmer", 0.6),
    (S5_CTA_AT, "bass_hit", 0.6),
]
