#!/bin/sh
slug=$1; naam=$2
node film.js $slug /home/claude/bouw/video/$slug > log_$slug.txt 2>&1 || exit 1
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $slug.stil.mp4)
python3 muziek.py $d muziek_$slug.wav
ffmpeg -v error -y -i $slug.stil.mp4 -i muziek_$slug.wav -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart $naam
echo klaar $slug $d >> log_$slug.txt
