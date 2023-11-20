#! /usr/bin/env python3

from flask import Flask, send_file, abort
from PIL import Image
import os
import io
import numpy as np
import traceback

app = Flask(__name__)

def print_exception(e):
    traceback.print_exception(type(e), e, e.__traceback__)

@app.route('/<path:filename>')
def get_file(filename):
    # Define the directory where your files are stored
    file_directory = '.'

    # Construct the full file path
    file_path = os.path.join(file_directory, filename)

    # If the file is a PNG, apply the conversion
    if filename.endswith('.png.saturated'):
        real_file_path = filename.strip('.saturated')

        # Check if the file exists
        if not os.path.isfile(real_file_path):
            abort(404)

        try:
            # Load the 16-bit monochrome image
            image = Image.open(real_file_path)

            # convert to 8-bit
            image = np.array(image) >> 8
            image = image.astype(np.uint8)

            image=image[::10,::10]

            # find saturated pixels
            image_saturation_mask=image>100

            # convert from monochrome to rgba by just repeating the same value 4 times
            image = np.expand_dims(image, axis=-1)
            image = np.repeat(image, 4, axis=-1)
            image[...,-1] = 255

            # turn saturated pixels red
            image[image_saturation_mask]=[255,0,0,255]

            # Convert the image to PIL format
            image = Image.fromarray(image)

            # Prepare the image for sending
            img_io = io.BytesIO()
            image.save(img_io, 'PNG')
            img_io.seek(0)

            # Send the converted image
            return send_file(img_io, mimetype='image/png')
        
        except Exception as e:
            print_exception(e)
            
            abort(500)


    # Check if the file exists
    if not os.path.isfile(file_path):
        abort(404)

    # For non-PNG files, just send the file as is
    return send_file(file_path)

if __name__ == '__main__':
    app.run(debug=True,port=8000)
