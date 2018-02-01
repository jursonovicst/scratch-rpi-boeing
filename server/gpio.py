import RPi.GPIO


class Gpio:
    gpioModeUnknown = -1
    gpioModePullUp = 0
    gpioModePullDown = 1
    gpioModeDOut = 3

    gpioHigh = 1
    gpioLow = 0
    gpioUnknown = -1

    def __init__(self):
        # Hardware SPI configuration:
        RPi.GPIO.setmode(RPi.GPIO.BOARD)
        self._ports = []

    def setup(self, port, mode):
        if( mode == Gpio.gpioModePullDown ):
            RPi.GPIO.setup(port, RPi.GPIO.IN, pull_up_down=RPi.GPIO.PUD_DOWN)
            if port not in self._ports:
                self._ports.append(port)

        if( mode == Gpio.gpioModePullUp ):
            RPi.GPIO.setup(port, RPi.GPIO.IN, pull_up_down=RPi.GPIO.PUD_UP)
            if port not in self._ports:
                self._ports.append(port)

        if( mode == Gpio.gpioModeDOut ):
            RPi.GPIO.setup(port, RPi.GPIO.OUT, initial=RPi.GPIO.LOW )
            if port not in self._ports:
                self._ports.append(port)

    def getValue(self, port):
        if port in self._ports and RPi.GPIO.gpio_function(port) == RPi.GPIO.IN:
            return self.gpioHigh if RPi.GPIO.input(port) == RPi.GPIO.HIGH else self.gpioLow

        return self.gpioUnknown

    def getValues(self):
        for port in self._ports:
            if ( RPi.GPIO.gpio_function(port) == RPi.GPIO.IN ):
                yield (port, self.gpioHigh if RPi.GPIO.input(port) == RPi.GPIO.HIGH else self.gpioLow)
            else:
                yield (port, self.gpioUnknown)

    def __del__(self):
        RPi.GPIO.cleanup(self._ports)
