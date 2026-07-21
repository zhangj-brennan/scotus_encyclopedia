from rembg import remove, new_session
from PIL import Image
import os

input_folder = "encyclopedia/portraits"
output_folder = "portraits_nobg_tuned"

os.makedirs(output_folder, exist_ok=True)

# Try: "u2net_human_seg" for portraits, or "isnet-general-use" for tricky images
session = new_session("u2net_human_seg")

for filename in os.listdir(input_folder):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        input_path = os.path.join(input_folder, filename)
        output_path = os.path.join(output_folder, os.path.splitext(filename)[0] + ".png")

        image = Image.open(input_path).convert("RGBA")

        output = remove(
            image,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=5,
            post_process_mask=False
        )

        output.save(output_path)
        print(f"Saved: {output_path}")