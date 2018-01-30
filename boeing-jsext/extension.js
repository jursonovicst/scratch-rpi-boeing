(function(ext) {
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.power = function(spidev, mcp3008ch) {
        return 5;
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['r', 'read mcp3008 on SPI %m.spidev ch %m.mcp3008ch', 'power', 2, 3],
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