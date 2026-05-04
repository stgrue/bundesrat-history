import os, glob
from cairosvg import svg2png
from PIL import Image
from io import BytesIO

# Get SVGs in version-sorted order
svgs = sorted(glob.glob('output/br*.svg'), key=lambda f: int(os.path.basename(f).replace('br','').replace('.svg','')))
print(f"Processing {len(svgs)} SVGs...")

frames = []
for i, svg_path in enumerate(svgs):
    png_data = svg2png(url=svg_path, output_width=800, output_height=500)
    img = Image.open(BytesIO(png_data)).convert('RGBA')
    # GIF needs palette mode - composite onto white background
    bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
    bg.paste(img, mask=img)
    frames.append(bg.convert('RGB'))
    if (i+1) % 50 == 0:
        print(f"  {i+1}/{len(svgs)} done")

# 20 seconds / 315 frames ≈ 63ms per frame
duration_ms = round(20000 / len(frames))
print(f"Saving GIF with {duration_ms}ms per frame...")
frames[0].save(
    'output/bundesrat_animation.gif',
    save_all=True,
    append_images=frames[1:],
    duration=duration_ms,
    loop=0
)
print("Done! Saved to output/bundesrat_animation.gif")
