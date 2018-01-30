# Import SPI library (for hardware SPI) and MCP3008 library.
import Adafruit_GPIO.SPI as SPI
import Adafruit_MCP3008


class Mcp3008:
    _mcp = None
    def __init__(self, spiport, spidevice):
        # Hardware SPI configuration:
        self._mcp = Adafruit_MCP3008.MCP3008(spi=SPI.SpiDev(spiport, spidevice))

    def getValue(self, ch):
        self._mcp.read_adc(ch)

    def getValues(self):
        for ch in range(0,8):
            yield (ch, self._mcp.read_adc(ch))

    def __del__(self):
        pass
