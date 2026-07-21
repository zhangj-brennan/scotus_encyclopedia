from rembg import remove
from PIL import Image
import os

input_folder = "portraits"
output_folder = "portraits_nobg"

os.makedirs(output_folder, exist_ok=True)

for filename in os.listdir(input_folder):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        input_path = os.path.join(input_folder, filename)

        output_filename = os.path.splitext(filename)[0] + ".png"
        output_path = os.path.join(output_folder, output_filename)

        try:
            image = Image.open(input_path).convert("RGBA")
            output = remove(image)
            output.save(output_path)
            print(f"Saved: {output_path}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print("Done.")