# Import SPI library (for hardware SPI) and MCP3008 library.
import Adafruit_GPIO.SPI as SPI
import Adafruit_MCP3008


class Mcp3008:
    def __init__(self, spiport, spidevice):
        #TODO: use try to catch invalid ports
        # Hardware SPI configuration:
        self._mcp = Adafruit_MCP3008.MCP3008(spi=SPI.SpiDev(spiport, spidevice))
        self._spidev = spidevice

    def getSpiDev(self):
        return self._spidev

    def getValue(self, ch):
        #TODO: use try to catch invalid ports
        self._mcp.read_adc(ch)

    def getValues(self):
        #TODO: use try to catch invalid ports
        for ch in range(0,8):
            yield (ch, self._mcp.read_adc(ch))
