(function(ext) {
    var mcp3008values = [-1,-1,-1,-1,-1,-1,-1,-1]

    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.mcp3008getValue = function(spidev, ch) {
        return ch*10;
    };

    ext.when_mcp3008changes = function(spidev, ch) {
        if (mcp3008ch[ch] == -1) {
            mcp3008values[ch] = mcp3008getValue(spidev, ch);
            return false;
        }

        if (mcp3008ch[ch] == mcp3008values[ch]) {
            return false;
        }

        mcp3008values[ch] = mcp3008getValue(spidev, ch);
        return true;
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['r', 'read mcp3008 on SPI %m.spidev ch %m.mcp3008ch', 'mcp3008getValue', 0, 0],
            ['h', 'when mcp3008 on SPI %m.spidev ch %m.mcp3008ch changes', 'when_mcp3008changes', 0, 0]
        ],
        menus: {
            spidev: ['0','1'],
            mcp3008ch: ['0', '1', '2', '3', '4', '5', '6', '7']
        },
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Boeing'
    };

    // Register the extension
    ScratchExtensions.register('Boeing extension', descriptor, ext);
})({});