from PIL import Image
import sys, os, math

INPUT = 'app/src/nana.gif'
OUTPUT_GIF = 'public/nana-avatar.gif'
OUTPUT_PNG = 'public/nana-avatar.png'
AVATAR_SIZE = (128, 128)
TARGET_FRAMES = 24

# Background is light gray: RGB ~200-226
# We treat any pixel where R,G,B are all close to each other AND > 180 as background
BG_MIN = 180
BG_DIFF = 30  # max difference between R,G,B channels for it to be 'gray'

img = Image.open(INPUT)
n_frames = img.n_frames
print(f'Source: {n_frames} frames, {img.size[0]}x{img.size[1]}')

step = max(1, n_frames // TARGET_FRAMES)
frame_indices = list(range(0, n_frames, step))[:TARGET_FRAMES]
print(f'Keeping {len(frame_indices)} frames')

def is_background(r, g, b, a):
    # Light gray: all channels high and close together
    if r > BG_MIN and g > BG_MIN and b > BG_MIN:
        diff = max(abs(r-g), abs(r-b), abs(g-b))
        if diff < BG_DIFF:
            return True
    # Also catch the corner vignette (slightly darker gray ~202)
    if r > 170 and g > 170 and b > 170:
        diff = max(abs(r-g), abs(r-b), abs(g-b))
        if diff < 15:
            return True
    return False

# First pass: find character bounds across all frames
all_miny, all_maxy, all_minx, all_maxx = 9999, 0, 9999, 0
for idx in frame_indices:
    img.seek(idx)
    frame = img.convert('RGBA')
    px = frame.load()
    w, h = frame.size
    fminx, fminy, fmaxx, fmaxy = w, h, 0, 0
    for y in range(0, h, 2):  # step 2 for speed
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if not is_background(r, g, b, a):
                fminx = min(fminx, x)
                fminy = min(fminy, y)
                fmaxx = max(fmaxx, x)
                fmaxy = max(fmaxy, y)
    if fmaxx > fminx:
        all_minx = min(all_minx, fminx)
        all_miny = min(all_miny, fminy)
        all_maxx = max(all_maxx, fmaxx)
        all_maxy = max(all_maxy, fmaxy)

print(f'Character bounds: x={all_minx}-{all_maxx}, y={all_miny}-{all_maxy}')
char_w = all_maxx - all_minx
char_h = all_maxy - all_miny
print(f'Character size: {char_w}w x {char_h}h')

# Make square crop with padding
pad = 15
side = max(char_w, char_h) + pad * 2
cx = (all_minx + all_maxx) // 2
cy = (all_miny + all_maxy) // 2
crop_x1 = max(0, cx - side // 2)
crop_y1 = max(0, cy - side // 2)
crop_x2 = min(img.size[0], cx + side // 2)
crop_y2 = min(img.size[1], cy + side // 2)
crop_box = (crop_x1, crop_y1, crop_x2, crop_y2)
print(f'Square crop box: {crop_box}')

# Second pass: process frames
processed = []
for idx in frame_indices:
    img.seek(idx)
    frame = img.convert('RGBA')
    px = frame.load()
    w, h = frame.size

    # Remove background pixels
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_background(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)

    # Crop and resize (maintain aspect ratio via square crop)
    cropped = frame.crop(crop_box)
    resized = cropped.resize(AVATAR_SIZE, Image.LANCZOS)
    processed.append(resized)

print(f'Processed {len(processed)} frames at {AVATAR_SIZE}')

# Save animated GIF with transparency
processed[0].save(
    OUTPUT_GIF,
    save_all=True,
    append_images=processed[1:],
    duration=120,
    loop=0,
    disposal=2,
    transparency=0,
    optimize=True,
)

# Save static PNG fallback
processed[0].save(OUTPUT_PNG, optimize=True)

gif_kb = os.path.getsize(OUTPUT_GIF) / 1024
png_kb = os.path.getsize(OUTPUT_PNG) / 1024
print(f'')
print(f'Done!')
print(f'  GIF: {gif_kb:.1f} KB ({AVATAR_SIZE[0]}x{AVATAR_SIZE[1]}, {len(processed)} frames)')
print(f'  PNG: {png_kb:.1f} KB')
