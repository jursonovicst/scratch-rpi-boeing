import RPi.GPIO


class Gpio:
    gpioModeUnknown = 'unknown'
    gpioModePullUp = 'pull-up'
    gpioModePullDown = 'pull-down'
    gpioModeDOut = 'd-out'

    gpioHigh = 'high'
    gpioLow = 'low'
    gpioUnknown = 'unknown'

    def __init__(self):
        # Hardware SPI configuration:
        RPi.GPIO.setmode(RPi.GPIO.BCM)
        self._ports = []

    def setup(self, port, mode):
        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModePullDown ):
            RPi.GPIO.setup(port, RPi.GPIO.IN, pull_up_down=RPi.GPIO.PUD_DOWN)
            if port not in self._ports:
                self._ports.append(port)

        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModePullUp ):
            RPi.GPIO.setup(port, RPi.GPIO.IN, pull_up_down=RPi.GPIO.PUD_UP)
            if port not in self._ports:
                self._ports.append(port)

        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModeDOut ):
            RPi.GPIO.setup(port, RPi.GPIO.OUT, initial=RPi.GPIO.LOW )
            if port not in self._ports:
                self._ports.append(port)

    # TODO: use try to catch invalid ports
    def getValue(self, port):
        if port in self._ports and (RPi.GPIO.gpio_function(port) == RPi.GPIO.IN or RPi.GPIO.gpio_function(port) == RPi.GPIO.OUT):
            return self.gpioHigh if RPi.GPIO.input(port) == RPi.GPIO.HIGH else self.gpioLow

        return self.gpioUnknown

    # TODO: use try to catch invalid ports
    def setValue(self, port, value):
        if port in self._ports and RPi.GPIO.gpio_function(port) == RPi.GPIO.OUT and (value == self.gpioLow or value == self.gpioHigh):
            RPi.GPIO.output(port, True if value == self.gpioHigh else False)

    # TODO: use try to catch invalid ports
    def getValues(self):
        for port in self._ports:
            if ( RPi.GPIO.gpio_function(port) == RPi.GPIO.IN ):
                yield (port, self.gpioHigh if RPi.GPIO.input(port) == RPi.GPIO.HIGH else self.gpioLow)

    def __del__(self):
        RPi.GPIO.cleanup(self._ports)
