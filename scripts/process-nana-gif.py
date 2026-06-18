from PIL import Image
import sys, os

INPUT = 'app/src/nana.gif'
OUTPUT_GIF = 'public/nana-avatar.gif'
OUTPUT_PNG = 'public/nana-avatar.png'
AVATAR_SIZE = (96, 96)
TARGET_FRAMES = 20
THRESHOLD = 35

img = Image.open(INPUT)
n_frames = img.n_frames
print(f'Source: {n_frames} frames, {img.size[0]}x{img.size[1]}')

step = max(1, n_frames // TARGET_FRAMES)
frame_indices = list(range(0, n_frames, step))[:TARGET_FRAMES]
print(f'Keeping {len(frame_indices)} frames')

processed = []
crop_box = None

for idx in frame_indices:
    img.seek(idx)
    frame = img.convert('RGBA')
    pixels = frame.load()
    w, h = frame.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r < THRESHOLD and g < THRESHOLD and b < THRESHOLD:
                pixels[x, y] = (0, 0, 0, 0)
            elif a > 10:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x > min_x and max_y > min_y:
        if crop_box is None:
            crop_box = (min_x, min_y, max_x, max_y)
        else:
            crop_box = (min(crop_box[0], min_x), min(crop_box[1], min_y), max(crop_box[2], max_x), max(crop_box[3], max_y))

if crop_box is None:
    print('ERROR: no content found')
    sys.exit(1)

pad = 5
crop_box = (max(0, crop_box[0]-pad), max(0, crop_box[1]-pad), min(img.size[0], crop_box[2]+pad), min(img.size[1], crop_box[3]+pad))
cw = crop_box[2] - crop_box[0]
ch = crop_box[3] - crop_box[1]
side = max(cw, ch)
cx = crop_box[0] + cw // 2
cy = crop_box[1] + ch // 2
crop_box = (max(0, cx-side//2), max(0, cy-side//2), min(img.size[0], cx+side//2), min(img.size[1], cy+side//2))
print(f'Square crop: {crop_box}')

for idx in frame_indices:
    img.seek(idx)
    frame = img.convert('RGBA')
    pixels = frame.load()
    w, h = frame.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r < THRESHOLD and g < THRESHOLD and b < THRESHOLD:
                pixels[x, y] = (0, 0, 0, 0)
    cropped = frame.crop(crop_box)
    resized = cropped.resize(AVATAR_SIZE, Image.LANCZOS)
    processed.append(resized)

print(f'Processed {len(processed)} frames at {AVATAR_SIZE}')

processed[0].save(OUTPUT_GIF, save_all=True, append_images=processed[1:], duration=150, loop=0, disposal=2, transparency=0, optimize=True)
processed[0].save(OUTPUT_PNG, optimize=True)

gif_kb = os.path.getsize(OUTPUT_GIF) / 1024
png_kb = os.path.getsize(OUTPUT_PNG) / 1024
print(f'Done! GIF: {gif_kb:.1f} KB, PNG: {png_kb:.1f} KB')
