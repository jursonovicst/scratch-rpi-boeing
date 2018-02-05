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


def volume(da, delta):
    dtype = da.dtype
    return np.clip(da * delta,np.iinfo(dtype).min,np.iinfo(dtype).max).astype(dtype)

def pitch(da, hz, fr):
    dtype = da.dtype
    shift = hz // fr

    #split it in left and right channel (assuming a stereo WAV file).
    left, right = da[0::2], da[1::2]  # left and right channel

    #Extract the frequencies using the Fast Fourier Transform built into numpy.
    lf, rf = np.fft.rfft(left), np.fft.rfft(right)

    #Roll the array to increase the pitch.
    lf, rf = np.roll(lf, shift), np.roll(rf, shift)

    #The highest frequencies roll over to the lowest ones. That's not what we want, so zero them.
    if shift>0:
        lf[0:shift], rf[0:shift] = 0, 0
    else:
        lf[:-shift], rf[:-shift] = 0, 0

    #Now use the inverse Fourier transform to convert the signal back into amplitude.
    nl, nr = np.fft.irfft(lf), np.fft.irfft(rf)

    #Combine the two channels.
    return np.clip(np.column_stack((nl, nr)),np.iinfo(dtype).min,np.iinfo(dtype).max).astype(dtype)

def pitchstretch(da, scale):
    dtype = da.dtype
    up, down = scale,1

    1    10 10
    0.5  5  10
    1.5  15 10

    #split it in left and right channel (assuming a stereo WAV file).
    left, right = da[0::2], da[1::2]  # left and right channel

    #Extract the frequencies using the Fast Fourier Transform built into numpy.
    lf, rf = np.fft.rfft(left), np.fft.rfft(right)

    #Roll the array to increase the pitch.
    lf, rf = np.roll(lf, shift), np.roll(rf, shift)

    #The highest frequencies roll over to the lowest ones. That's not what we want, so zero them.
    if shift>0:
        lf[0:shift], rf[0:shift] = 0, 0
    else:
        lf[:-shift], rf[:-shift] = 0, 0

    #Now use the inverse Fourier transform to convert the signal back into amplitude.
    nl, nr = np.fft.irfft(lf), np.fft.irfft(rf)

    #Combine the two channels.
    return np.clip(np.column_stack((nl, nr)),np.iinfo(dtype).min,np.iinfo(dtype).max).astype(dtype)



if __name__ == '__main__':

    print(np.array([1,-33,-3333333,4,5333333333333333332],dtype=np.int16))
#    exit(0)

    f = wave.open("dc10.wav", 'rb')
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

    delta =     3.1

    fr = 20
    wlen = f.getframerate()//fr
    device.setperiodsize(wlen)

    data = f.readframes(wlen)
    while data:
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            line = sys.stdin.readline()

            if line.strip() == "u":
                delta += 0.1
                print("%f" % delta)
            elif line.strip() == "d":
                delta -= 0.1
                print("%f" % delta)

        #Read the data, split it in left and right channel (assuming a stereo WAV file).
        da = np.fromstring(data, dtype=dtype)

        # change volume
        #daa = volume(da, delta)
        daa = pitch(da, -300,fr)

        # Read data from stdin
        device.write(daa)
        data = f.readframes(wlen)


    f.close()
