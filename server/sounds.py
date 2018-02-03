#!/usr/bin/python


# Simple test script that plays (some) wav files

from __future__ import print_function

import sys
import wave
import getopt
import alsaaudio
import select
import numpy as np
from scipy import signal


if __name__ == '__main__':


    f = wave.open("X320_ENG.wav", 'rb')
    device = alsaaudio.PCM()

    print('%d channels, %d sampling rate, %d sampling width\n' % (f.getnchannels(),
                                                                  f.getframerate(),
                                                                  f.getsampwidth()))
    # Set attributes
    device.setchannels(f.getnchannels())
    device.setrate(f.getframerate())

    # 8bit is unsigned in wav files
    if f.getsampwidth() == 1:
        device.setformat(alsaaudio.PCM_FORMAT_U8)
        dtype = np.uint8
    # Otherwise we assume signed data, little endian
    elif f.getsampwidth() == 2:
        device.setformat(alsaaudio.PCM_FORMAT_S16_LE)
        dtype = np.int16
    elif f.getsampwidth() == 3:
        device.setformat(alsaaudio.PCM_FORMAT_S24_3LE)
    elif f.getsampwidth() == 4:
        device.setformat(alsaaudio.PCM_FORMAT_S32_LE)
        dtype = np.int32
    else:
        raise ValueError('Unsupported format')

    resample = 0.6

    fr = 20
    rlen = int(f.getframerate()/fr*resample)
    wlen = int(f.getframerate()/fr)
    device.setperiodsize(wlen)

    data = f.readframes(rlen)
    while data:
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            line = sys.stdin.readline()

            if line.strip() == "u":
                resample += 0.1
                print("%f" % resample)
            elif line.strip() == "d":
                resample -= 0.1
                print("%f" % resample)
            rlen = int(f.getframerate() / fr * resample)
            wlen = int(f.getframerate() / fr)

        #Read the data, split it in left and right channel (assuming a stereo WAV file).
        da = np.fromstring(data, dtype=dtype)

        left, right = da[0::2], da[1::2]  # left and right channel

        l2 = signal.resample(left,wlen)
        r2 = signal.resample(right,wlen)

        #Combine the two channels.
        ns = np.column_stack((l2, r2)).ravel().astype(dtype)

        # Read data from stdin
        device.write(ns.tostring())
        data = f.readframes(rlen)


    f.close()
