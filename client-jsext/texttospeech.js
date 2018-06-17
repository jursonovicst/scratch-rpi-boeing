(function (tts) {
    console.log('Text to speech');

    var d = new Date();

    // 0 = no debug
    // 1 = low level debug
    // 2 = high - open the floodgates
    // Variable is set by user through a Scratch command block
    var debugLevel = 0;

    var serverAccessURL = "http://127.0.0.1:8001";

    // a variable to set the color of the 'LED' indicator for the extension on the Scratch editor
    var status = 2; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    var statusMessage = "Uninitialized";
    const STATUSRED = 0, STATUSYELLOW = 1, STATUSGREEN = 2;


    // Cleanup function when the extension is unloaded
    tts._shutdown = function (
        //TODO: code
    ) {
    };


    // Status reporting code, called by Scratch
    tts._getStatus = function () {
        $.ajax({
            url: boeingAccessURL + '/status',
            dataType: 'text',
            success: function (data) {
                tts._setStatus(STATUSGREEN);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                tts._setStatus(STATUSRED, textStatus);
            }
        });
        return {
            status: status,
            msg: statusMessage
        };
    };

    tts._setStatus = function (stat, message = "") {
        status = stat;
        if (status !== STATUSGREEN && message !== "") {
            statusMessage = d.toISOString() + " " + message;
        }
    };


    //////////////////////////////
    // Text to speech functions //
    //////////////////////////////

    // Read analog value
    tts.say = function (words) {
        $.ajax({
            url: boeingAccessURL + "/say/" + encodeURI(words),
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                tts._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };


    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            [' ', 'say %s', 'say', "Hello world!"],
        ],
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Text to Speech'
    };

    // Register the extension
    ScratchExtensions.register('Text to speech extension', descriptor, tts);


})({});