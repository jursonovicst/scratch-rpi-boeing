
try:
    import RPi.GPIO as GPIO
except ImportError:
    print("error importing HW modules, run in simulation mode")
    exit(1)



class MyGPIO:
    gpioModeUnknown = 'unknown'
    gpioModePullUp = 'pull-up'
    gpioModePullDown = 'pull-down'
    gpioModeDOut = 'd-out'

    gpioHigh = 'high'
    gpioLow = 'low'
    gpioUnknown = 'unknown'

    def __init__(self):
        # Hardware SPI configuration:
        GPIO.setmode(GPIO.BCM)
        self._ports = []

    def setup(self, port, mode):
        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModePullDown ):
            GPIO.setup(port, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
            if port not in self._ports:
                self._ports.append(port)

        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModePullUp ):
            GPIO.setup(port, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            if port not in self._ports:
                self._ports.append(port)

        #TODO: use try to catch invalid ports
        if( mode == Gpio.gpioModeDOut ):
            GPIO.setup(port, GPIO.OUT, initial=GPIO.LOW )
            if port not in self._ports:
                self._ports.append(port)

    # TODO: use try to catch invalid ports
    def getValue(self, port):
        if port in self._ports and (GPIO.gpio_function(port) == GPIO.IN or GPIO.gpio_function(port) == GPIO.OUT):
            return self.gpioHigh if GPIO.input(port) == GPIO.HIGH else self.gpioLow

        return self.gpioUnknown

    # TODO: use try to catch invalid ports
    def setValue(self, port, value):
        if port in self._ports and GPIO.gpio_function(port) == GPIO.OUT and (value == self.gpioLow or value == self.gpioHigh):
            GPIO.output(port, True if value == self.gpioHigh else False)

    # TODO: use try to catch invalid ports
    def getValues(self):
        for port in self._ports:
            if ( GPIO.gpio_function(port) == GPIO.IN ):
                yield (port, self.gpioHigh if GPIO.input(port) == GPIO.HIGH else self.gpioLow)

    def __del__(self):
        GPIO.cleanup(self._ports)
