(function(ext) {
    console.log('Beoing');

    // 0 = no debug
    // 1 = low level debug
    // 2 = high - open the floodgates
    // Variable is set by user through a Scratch command block
    var debugLevel = 0;

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
            url: 'http://127.0.0.1:8000/status',
            dataType: 'text',
            success: function( status_message ) {
                boeingStatus = 2;
                boeingStatusMessage = status_message;
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




    ext.connectBoeing = function(callback) {
        var timeoutID; // need to set a timeout when a socket is created because we are using a 'wait' block

        webSocket = new WebSocket('ws://10.157.118.45:8000');

        // start the timer for a server reply - we wait for up to 2 seconds for the reply
        timeoutID = window.setTimeout(noServerAlert, 2000);

        // attach an onopen handler to this socket. This message is sent by a servers websocket
        socket.onopen = function (event) {
            window.clearTimeout(timeoutID);
            if (debugLevel >= 1)
                console.log('onopen message received');
            // change the board status to green with the first board added, since we don't know ahead of time
            // how many boards are attached
            boardStatus = 2;
            callback(); // tell scratch to proceed processing
        };

        function noServerAlert() {
            // timeout exceeded, socket not connected :(
            boardStatus = 0;
        }

        // All messages sent from board's socket are handled here.
        // Attach an onmessage event handler to this socket.
        // Process messages received from the server associated with this socket.
        socket.onmessage = function (message) {
            if (debugLevel === 1)
                console.log('onmessage received: ' + message.data);

            // All message components are delimited with '/' character.
            // TODO: Should this be done with JSON?

            // Incoming messages are split into their component pieces and placed into a 'msg' array
            // msg[0] for each message is the message ID.
            var msg = message.data.split('/');

            // process each message ID
            switch (msg[0]) {
                // dataUpdate - server data update data message
                case 'dataUpdate':
                    var index = msg[1]; // unique value used as an index into sensorDataArray
                    var data = msg[2]; // data value to be entered into sensorDataArray
                    if (debugLevel >= 2)
                        console.log('sensorData: index = ' + index + ' data = ' + data);
                    // update the array with the new value
                    sensorDataArray[index].value = data;
                    break;

            /***************************************
             ************** server detected errors
             ****************************************/

                // server detected a problem in setting the mode of this pin
                case 'invalidSetMode':
                case 'invalidPinCommand':
                    console.log('invalid alerts:' + 'index: ' + msg[1] + 'board: ' + msg[2] + 'pin: ' + msg[3]);
                    createAlert(msg[1], msg[2], msg[3]);
                    break;
                default:
                    if (debugLevel >= 1)
                        console.log('onmessage unknown message received');
            }
};
    };


    ext.mcp3008getValue = function(spidev, ch) {
        return ch*10;
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