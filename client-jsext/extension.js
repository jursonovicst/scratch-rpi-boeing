(function(ext) {
    console.log('Beoing');

    // 0 = no debug
    // 1 = low level debug
    // 2 = high - open the floodgates
    // Variable is set by user through a Scratch command block
    var debugLevel = 0;

    var boeingAccessURL = "http://10.157.118.45:8000";

    // a variable to set the color of the 'LED' indicator for the extension on the Scratch editor
    var boeingStatus = 0; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    var boeingStatusMessage = "uninitialized";

    // mcp IC
    var mcp3008DataArray = [-1,-1,-1,-1,-1,-1,-1,-1];


    // Cleanup function when the extension is unloaded
    ext._shutdown = function (
    ) {};


    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        $.ajax({
            url: boeingAccessURL + '/status',
            dataType: 'text',
            success: function( data ) {
                boeingStatus = 2;
                boeingStatusMessage = data;
            },
            error: function( jqXHR, textStatus, errorThrown ) {
                boeingStatus = 0;
                boeingStatusMessage = textStatus;
            }
        });
        return {status: boeingStatus,
                msg: boeingStatusMessage
                };
    };

    ext._poll = function() {
        $.ajax({
            url: boeingAccessURL + '/poll',
            dataType: 'text',
            success: function( data ) {
                var lines = data.split('\n');
                for(var i = 0;i < lines.length;i++){
                    var elements = lines[i].split(' ');
                    var params = elements[0].split('/');
                    var ch = Number(params[2]);
                    var value = Number(elements[1]);
                    mcp3008DataArray[ch] = value;
                }

            },
            error: function( jqXHR, textStatus, errorThrown ) {
                boeingStatus = 1;
                boeingStatusMessage = textStatus;
            }
        });
    }

    ext.mcp3008getValue = function(spidev, ch) {
        ext._poll();
        return mcp3008DataArray[ch];
    };

    ext.when_mcp3008changes = function(spidev, ch) {
        if (mcp3008ch[ch] == -1) {
            mcp3008DataArray[ch] = mcp3008getValue(spidev, ch);
            return false;
        }

        if (mcp3008ch[ch] == mcp3008values[ch]) {
            return false;
        }

        mcp3008DataArray[ch] = mcp3008getValue(spidev, ch);
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