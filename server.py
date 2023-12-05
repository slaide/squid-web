#! /usr/bin/env python3

from flask import Flask, send_file, abort, request
from PIL import Image
import os
import io
import numpy as np
import traceback
import cv2
import time
from dataclasses import dataclass
import typing as tp

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

@dataclass
class CachedImage:
    image: np.ndarray
    last_access_time: float

image_scale_cache:tp.Dict[str,CachedImage]={}

@app.route('/<path:filename>')
def get_file(filename):
    # Define the directory where your files are stored
    file_directory = '.'

    # Construct the full file path
    file_path = os.path.join(file_directory, filename)

    # If the file is a tiff, convert to png
    if filename.endswith('.tiff') or filename.endswith('.tif'):
        raw_filename=filename

        file_is_in_cache=raw_filename in image_scale_cache

        highlight_saturated_pixels='.saturated' in filename
        filename = filename.replace('.saturated','')

        brightness_factor=1.0
        filename_segments=filename.split('.')
        for segment in filename_segments:
            if segment.startswith('b') and len(segment)==len('b1_0'):
                brightness_factor=float(segment[1:].replace('_','.'))
                filename=filename.replace(f".{segment}",'')

                break

        downsample_factor=5

        image_as_highres='.highres' in filename
        filename = filename.replace('.highres','')
        image_as_halfres='.halfres' in filename
        filename = filename.replace('.halfres','')
        image_as_midres='.midres' in filename
        filename = filename.replace('.midres','')
        image_as_lowres='.lowres' in filename
        filename = filename.replace('.lowres','')

        if image_as_highres:
            downsample_factor=1
        if image_as_halfres:
            downsample_factor=2
        if image_as_midres:
            downsample_factor=5
        if image_as_lowres:
            downsample_factor=10

        # Check if the file exists
        if not os.path.isfile(filename):
            abort(404)

        if file_is_in_cache:
            cached_image = image_scale_cache[raw_filename]
            img_data = cached_image.image

        else:
            # Load the 16-bit monochrome image
            image=cv2.imread(filename,cv2.IMREAD_UNCHANGED)

            # convert to 8-bit
            image = np.array(image)
            image >>= 8

            # downsample
            image=image[::downsample_factor,::downsample_factor]*np.array(brightness_factor)

            U8_MAX=255

            image=image.clip(max=U8_MAX)
            image = image.astype(np.uint8)
            
            if highlight_saturated_pixels:

                # find saturated pixels
                image_saturation_mask=image==U8_MAX

                # convert from monochrome to rgba by just repeating the same value 4 times
                image = np.expand_dims(image, axis=-1)
                image = np.repeat(image, 4, axis=-1)
                image[...,-1] = U8_MAX

                # turn saturated pixels red
                image[image_saturation_mask]=[U8_MAX,0,0,U8_MAX]

            # Convert the image to PIL format
            image = Image.fromarray(image)

            # Prepare the image for sending
            img_io = io.BytesIO()
            # send image as png (tiff is not supported in the browser)
            # note on compression level: very quickly diminishing returns beyond 1 (where 0 is actually no compression, and 1 is just the fastest compression)
            image.save(img_io, 'PNG', compress_level=1)
            # reset the buffer
            img_io.seek(0)

            # read file into buffer
            img_data = img_io.read()

            # store in cache
            image_scale_cache[raw_filename]=CachedImage(img_data,time.time())

        # Create a new BytesIO object from the cached data
        new_img_io = io.BytesIO(img_data)

        # Send the converted image
        return send_file(new_img_io, mimetype='image/png')


    # Check if the file exists
    if not os.path.isfile(file_path):
        abort(404)

    # For non-PNG files, just send the file as is
    return send_file(file_path)

if __name__ == '__main__':
    app.run(debug=True,port=8000,use_reloader=False)
