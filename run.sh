#!/bin/sh
node-sass src/sass/ -r  -o src/public/assets/css/ --output-style compressed
postcss src/public/assets/css/*.css --use=autoprefixer -r --verbose