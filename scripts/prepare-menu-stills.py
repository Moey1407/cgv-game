"""Compress original in-game captures for the chapter UI; no downloaded art."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
out = root / 'public/ui'
out.mkdir(parents=True, exist_ok=True)
for name in ['chapter-gala', 'chapter-vault', 'chapter-roof']:
    image = Image.open(root / 'work' / (name + '.png')).convert('RGB')
    image.thumbnail((1280, 720))
    target = out / (name + '.webp')
    image.save(target, 'WEBP', quality=86, method=6)
    print(f'{name}: {target.stat().st_size:,} bytes')
