#!/usr/bin/env bash

#sudo ps aux | grep 'python.*scratch_gpio_handler.py' | grep -v grep | awk '{print $2}' | xargs sudo kill -9
#sudo python /home/pi/simplesi_scratch_handler/scratch_gpio_handler.py &

# tell the user, that loading sequence started
echo "starting system check sequence" |festival --tts

# start Scratch2 and load boeing application
scratch2 /home/pi/scratch-rpi-boeing/scratch/airplaneApp.sbx &
#scratch2 /home/pi/scratch-rpi-boeing/scratch/airplaneApp.sb2 &

# wait for scratch2 to start and load sbx
sleep 60

# virtually press button a to trigger initialization
a=$(xdotool search --name Scratch)
xdotool windowactivate $a
xdotool key --window $a a
