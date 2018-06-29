import pyaudio
import numpy as np
import matplotlib.pyplot as plt


class TemplateComponent:

    def __init__(self, rate):
        self._rate = int(rate)


class SingleFrequency(TemplateComponent):

    def __init__(self, rate, phase=0):
        super().__init__(rate)
        self._frequency = None
        self._phase = np.float64(phase)

    def nextframe(self, count, frequency, power, vibration=0.):
        assert(count > 0), f"count must be positive, got: '{count}'"

        # get the start frequency, phase
        frequency_prev = frequency if self._frequency is None else self._frequency
        phase_prev = self._phase

        # calcualte the frequencies for each step
        if frequency_prev == frequency:
            frequency_steps = np.ones(count, dtype=np.float64) * frequency
        else:
            frequency_steps = np.arange(frequency_prev, frequency, (frequency-frequency_prev) / count, dtype=np.float64)
        assert(len(frequency_steps)==count), f"{len(frequency_steps)} sample generated, but {count} required"

        # calculate the phase steps
        phase_steps = 2 * np.pi / self._rate * frequency_steps

        # add vibration
        phase_steps += vibration * np.random.randn(count)

        # adjust to start with previous
        phases = phase_prev + np.cumsum(phase_steps, dtype=np.float64)

        # set the next phase, frequency
        self._frequency = frequency
        self._phase = phases[-1]

        return power * np.sin(phases, dtype=np.float64)


class HarmonicFrequency(TemplateComponent):

    def __init__(self, rate, ncomp=5):
        super().__init__(rate)
        self._ncomp = int(ncomp)
        self._components = []
        for i in range(ncomp):
            self._components.append(SingleFrequency(rate))

    def nextframe(self, count, frequency, power, pdecay=0.5, vibration=0, vdecay=0.8):
        wave = np.zeros(count, dtype=np.float64)
        for i in range(self._ncomp):
            wave += self._components[i].nextframe(count, (i+1) * frequency, pdecay**i * power, vdecay**i * vibration)

        assert(len(wave) == count)
        return wave


class WhiteNoise(TemplateComponent):

    def __init__(self):
        super().__init__(0)

    def nextframe(self, count, power):
        assert(count > 0), f"count must be positive, got: '{count}'"

        noise = np.random.randn(count)
        return power * noise


class Engine(TemplateComponent):

    @staticmethod
    def thrust2fan(thrust, maxfrequency=200, maxpower=400, cutoff=20, maxvibration=0.02):
        assert(np.max(thrust) <= 100)
        assert(0 <= np.min(thrust))
        return thrust / 100 * maxfrequency, np.tanh(thrust / cutoff) * maxpower, 0.8, thrust / 100 * maxvibration

    @staticmethod
    def thrust2compressor(thrust, maxfrequency=500, maxpower=120, cutoff=70, maxvibration=0.005):
        assert(np.max(thrust) <= 100)
        assert(0 <= np.min(thrust))
        return thrust / 100 * maxfrequency, np.tanh(thrust / cutoff) * maxpower, 0.5, thrust / 100 * maxvibration

    @staticmethod
    def thrust2wn(thrust, maxpower=20, cutoff=80):
        assert(np.max(thrust) <= 100)
        assert(0 <= np.min(thrust))
        return maxpower * np.tanh(thrust / cutoff)

    def __init__(self, rate):
        super().__init__(rate)
        self._fan = HarmonicFrequency(rate)
        self._compressor= HarmonicFrequency(rate)
        self._whitenoise = WhiteNoise()

        self._thrust = 0

    def setThrust(self, thrust):
        assert(0 <= thrust), f"Invalid thrust value: {thrust}"
        assert(thrust <= 100), f"Invalid thrust value: {thrust}"
        self._thrust = thrust

    def nextframe(self, count):
        assert(count > 0), f"count must be positive, got: '{count}'"

        wave = np.zeros(count)

        fanfrequency, fanpower, fanpdecay, fanvibration = Engine.thrust2fan(self._thrust)
        wave += self._fan.nextframe(count, fanfrequency + 0.00001, fanpower, fanpdecay, fanvibration)

        compfrequency, comppower, comppdecay, compvibration = Engine.thrust2compressor(self._thrust)
        wave += self._compressor.nextframe(count, compfrequency + 0.00001, comppower, comppdecay, compvibration)

        wnpower = Engine.thrust2wn(self._thrust)
        wave += self._whitenoise.nextframe(count, wnpower)


        assert (len(wave) == count), f"expect: {count} , got: {len(wave)}"
        return wave.astype(np.int16)

    def plot(self):

        x = np.arange(101)
        fanfrequency, fanpower, _, fanvibration = Engine.thrust2fan(x)
        compfrequency, comppower, _, compvibration = Engine.thrust2compressor(x)
        wnpower = Engine.thrust2wn(x)

        fig, axs = plt.subplots(3, 1)
        fig.tight_layout()
        axs[0].plot(x,fanfrequency, label='fanfrequency')
        axs[0].plot(x,compfrequency, label='compfrequency')
        axs[0].legend()
        axs[1].plot(x,fanpower, label='fanpower')
        axs[1].plot(x,comppower, label='comppower')
        axs[1].plot(x,wnpower, label='wnpower')
        axs[1].legend()
        plt.show()



class Synth:

    def __init__(self, rate=22050, capoutput=0.1):
        self._pyaudio = pyaudio.PyAudio()
        self._chunk = rate // 10
        self._channels = 2
        assert(0 < capoutput), f"invalid cap value for output {capoutput}"
        assert(capoutput <= 1), f"invalid cap value for output {capoutput}"
        self._capoutput = capoutput
        self._stream = self._pyaudio.open(  format=pyaudio.paInt16,
                                channels=self._channels,
                                rate=rate,
                                output=True,
                                start=False,
                                frames_per_buffer=self._chunk,
                                stream_callback=self.pyaudio_callback)

        self._engine_l = Engine(rate)
        self._engine_r = Engine(rate)

    def __del__(self):
        self.stopaudio()

        self._stream.close()
        self._pyaudio.terminate()


    def pyaudio_callback(self, in_data,  # recorded data if input=True; else None
                      frame_count,  # number of frames
                      time_info,  # dictionary
                      status_flags):
        wave_engine_l = self._engine_l.nextframe(frame_count)
        wave_engine_r = self._engine_r.nextframe(frame_count)

        # stack
        wave = np.reshape(np.stack((wave_engine_l, wave_engine_r)), 2 * frame_count, order='F')

        # cap to protect sound card
        limit_top = np.iinfo(np.int16).max * self._capoutput
        limit_bottom = np.iinfo(np.int16).min * self._capoutput
        np.clip(wave, limit_bottom, limit_top)

        assert (len(wave) == frame_count*2), f"expect: {frame_count*2} , got: {len(wave)}"
        return (wave.astype(np.int16), 0)


    def startaudio(self):
        self._stream.start_stream()

    def stopaudio(self):
        self._stream.stop_stream()

#    @pyqtSlot(int, int)
    def get_slider_value(self, thrust_l, thrust_r):
        self._engine_l.setThrust(thrust_l)
        self._engine_r.setThrust(thrust_r)




if __name__ == "__main__":
    import sys
    from PyQt5.QtWidgets import QSlider, QDialog, QLabel, QHBoxLayout, QApplication
    from PyQt5.QtCore import Qt, pyqtSignal


    class Engine_Dialog(QDialog):
        changedValue = pyqtSignal(int, int)

        def __init__(self):
            super(Engine_Dialog, self).__init__()
            self.init_ui()
            self._left_engine = 0
            self._right_engine = 0

        def init_ui(self):
            # Creating a label
            self.slider_l_label = QLabel('Left:', self)
            self.slider_r_label = QLabel('Right:', self)

            # Creating a slider and setting its maximum and minimum value
            self.slider_l = QSlider(self)
            self.slider_l.setMinimum(0)
            self.slider_l.setMaximum(100)
            self.slider_l.setOrientation(Qt.Vertical)

            self.slider_r = QSlider(self)
            self.slider_r.setMinimum(0)
            self.slider_r.setMaximum(100)
            self.slider_r.setOrientation(Qt.Vertical)

            # Creating a horizontalBoxLayout
            self.hboxLayout = QHBoxLayout(self)

            # Adding the widgets
            self.hboxLayout.addWidget(self.slider_l_label)
            self.hboxLayout.addWidget(self.slider_l)
            self.hboxLayout.addWidget(self.slider_r_label)
            self.hboxLayout.addWidget(self.slider_r)

            # Setting main layout
            self.setLayout(self.hboxLayout)

            # Setting a connection between slider position change and on_changed_value function we created earlier
            self.slider_l.valueChanged.connect(self.on_changed_l_value)
            self.slider_r.valueChanged.connect(self.on_changed_r_value)

            self.setWindowTitle("Dialog with a Slider")
            self.show()

        def on_changed_l_value(self, value):
            self._left_engine = value
            self.changedValue.emit(self._left_engine, self._right_engine)

        def on_changed_r_value(self, value):
            self._right_engine = value
            self.changedValue.emit(self._left_engine, self._right_engine)

    synth = Synth()

    app = QApplication(sys.argv)
    sd = Engine_Dialog()

    sd.changedValue.connect(synth.get_slider_value)

    synth.startaudio()
    sys.exit(app.exec_())

