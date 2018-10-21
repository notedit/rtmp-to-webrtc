#!/bin/bash

ffmpeg -f lavfi -re -i color=black:s=640x480:r=15 -filter:v "drawtext=text='%{localtime\:%T}':fontcolor=white:fontsize=80:x=20:y=20" \
-vcodec libx264 -tune zerolatency -preset ultrafast  -bsf:v h264_mp4toannexb  \
-g 15 -keyint_min 15 -profile:v baseline -level 3.0 -pix_fmt yuv420p -r 15 -f flv rtmp://39.106.248.166/live/live


