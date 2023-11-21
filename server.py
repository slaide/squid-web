#! /usr/bin/env python3

from flask import Flask, send_file, abort, request
from PIL import Image
import os
import io
import numpy as np
import traceback

from pathlib import Path

app = Flask(__name__)

def print_exception(e):
    traceback.print_exception(type(e), e, e.__traceback__)

def expect_config():
    if not request.is_json:
        return "request does not indicate json content", 400

    try:
        data=request.get_json()
    except:
        return "request body is not valid json", 400
    
    return data

@app.route('/api/fullPathName', methods=['POST'])
def fullPathName():
    data=expect_config()

    full_output_path=str(Path(data['base_path'])/data['project_name']/data['plate_name'])

    # return json object
    return {
        "full_output_path": full_output_path
    }

@app.route('/api/requiredStorage', methods=['POST'])
def grequiredStorageetit():
    data=expect_config()

    # get number of bytes per pixel
    pixel_depth_value=data['pixel_depth']['handle']
    if(pixel_depth_value=='mono8'):
        num_bytes_per_pixel=1
    elif(pixel_depth_value=='mono12'):
        num_bytes_per_pixel=2
    else:
        raise ValueError(f"pixel_depth must be mono8 or mono12 but is instead '{pixel_depth_value}'")
    
    # get number of positions per well
    num_pos_per_well=data['grid']['num_x']*data['grid']['num_y']*data['grid']['num_z']*data['grid']['num_t']

    # get number of selected channels
    num_channels=1 # TODO

    # get number of selected wells
    num_wells_selected=0
    for row in data['well_selection']:
        for col in row:
            if col:
                num_wells_selected+=1

    # finally calculate max required storage
    num_images=num_wells_selected*num_pos_per_well*num_channels
    
    pixel_per_image=2500*2500 
    max_required_storage=num_images*num_bytes_per_pixel*pixel_per_image

    # return json object
    return {
        "max_required_storage": max_required_storage
    }    

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
