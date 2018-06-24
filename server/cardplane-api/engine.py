try:
    import pyaudio
    import numpy as np
    from threading import Thread, Event
except ImportError:
    print("error importing API modules")
    exit(1)


from random import randint


class Engine(Thread):
    def __init__(self, format = pyaudio.paInt16, channels = 2, rate = 22050, volume = [0,0]):
        super().__init__()

        if not isinstance(volume, list):
            raise ValueError(f"Volume is not a list, but {type(volume)}")

        if len(volume) != channels:
            raise ValueError(f"Volume must have {channels} length!")

        self._channels = channels
        self._volume = volume

        self._p = pyaudio.PyAudio()
        self._stream = self._p.open(format=format,
                        channels=channels,
                        rate=rate,
                        output=True)
        self._startengine = Event()
        self._stopengine = Event()
        self._stopengine.set()

        self._run = True

        super().start()


    def setVolume(self, ch, volume):
        self._volume[ch] = volume

    def start(self):
        self._startengine.set()

    def stop(self):
        self._stopengine.set()

    def kill(self):
        self._run = False
        self.join(5)

    def run(self):
        CHUNK = 2048
        while self._run:

            self._startengine.wait()
            self._stopengine.clear()
            while not self._stopengine.is_set() and self._run:
                data = np.random.uniform(-1, 1, CHUNK)  # 44100 random samples between -1 and 1
                scaled = np.int16(data / np.max(np.abs(data)) * 32767 * self._volume[0])
                self._stream.write(scaled)
            self._startengine.clear()


    def __del__(self):
        self._stream.stop_stream()
        self._stream.close()

        self._p.terminate()


if __name__ == "__main__":
    engine = Engine()

    import time

    engine.start()
    time.sleep(1)
    engine.setVolume(0,0.1)
    time.sleep(1)
    engine.setVolume(0,0.2)
    time.sleep(1)
    engine.setVolume(0,0.3)
    time.sleep(1)
    engine.setVolume(0,0.4)
    time.sleep(1)
    engine.setVolume(0,0.5)
    time.sleep(1)
    engine.setVolume(0,0.6)
    engine.stop()

    time.sleep(5)

    engine.setVolume(0,0.1)
    engine.start()
    time.sleep(1)
    engine.setVolume(0,0.1)
    time.sleep(1)
    engine.setVolume(0,0.2)
    time.sleep(1)
    engine.setVolume(0,0.3)
    time.sleep(1)
    engine.setVolume(0,0.4)
    time.sleep(1)
    engine.setVolume(0,0.5)
    time.sleep(1)
    engine.setVolume(0,0.6)
    engine.stop()

    engine.kill()
