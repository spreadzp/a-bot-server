const net = require('toa-net');
const logger = require('./winston');
const udp = require('dgram');
const pricesFromExchanges = [];
const exchanges = [];
const priceTable = {};
const auth = new net.Auth('secretxxx');
let client = null;

const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        if (message.type === 'notification') {
            let diff = Date.now() - parseInt(message.payload.params[4]);
            if (Number.isInteger(diff)) {
                console.log(`TCP mashine = ${message.payload.params[5]} ${message.payload.method} = ${message.payload.params[0]} volume =${message.payload.params[3]} sent = ${diff} ms`);
            }

            parseMessage(message);
            showPrice(priceTable);
        }
        if (message.type === 'request') {
            startClient(message.payload.params)
            // echo request 
            socket.success(message.payload.id, message.payload.params)
        }
    })
})
server.listen(8000)

// Enable authentication for server
server.getAuthenticator = function () {
    return (signature) => auth.verify(signature)
}

function parseMessage(message) {
    const splitMethodName = message.payload.method.split(' ');
    let flag = true;
    if (pricesFromExchanges.length > 0) {
        pricesFromExchanges.find(function (value, index) {
            if (value.exchange === splitMethodName[0] && value.asset === splitMethodName[1]) {
                value.price = message.payload.params[0];
                flag = false;
            }
            if (index === pricesFromExchanges.length - 1 && flag) {
                newPrice = {}
                newPrice.exchange = splitMethodName[0];
                newPrice.asset = splitMethodName[1];
                newPrice.price = message.payload.params[0];
                pricesFromExchanges.push(newPrice);
            }
        });
    } else {
        newPrice = {}
        newPrice.exchange = splitMethodName[0];
        newPrice.asset = splitMethodName[1];
        newPrice.price = message.payload.params[0];
        pricesFromExchanges.push(newPrice);
    }
    priceTable[message.payload.method] = message.payload.params[0];
}

function showPrice(prices) {
    //console.log('prices :', prices);
}

function createClient(clientSocket) {
    client = new net.Client()
    // Enable authentication for client
    client.getSignature = function () {
        return auth.sign({ id: 'clientIdxxx' })
    }
    client.connect(clientSocket);
}

function startClient({ serverPort = 0, url = 'localhost', exchange = 'Bittrex' }) {
    const newExchange = { serverPort, url, exchange }
    exchanges.push(newExchange);

    try {
        const clientSocket = `tcp://${url}:${serverPort}`;
        createClient(clientSocket);
        client.on('error', (err) => {
            //console.log('err.trace :', err); 
            if (err.code === 'ETIMEDOUT') {
                client.destroy();
            }
            //createClient(clientSocket);
            clientReconnection(clientSocket)
        });
        client.notification('hello', [`+++++++${exchange} ${Date.now()}`])
    } catch (e) {
        //console.log('err :', e);

    } finally {
        //client.destroy();
    }

    function clientReconnection(clientSocket) {
        //console.log('client try reconnecting to port :', clientSocket);
        client.reconnect();
        logger.log(`info`,
            `client.rpcCount= ${client.rpcCount}
            client.socket= ${client.socket}
            client.connected= ${client.connected}
            client.rpcCount= ${client.rpcCount}
            client.connectOptions= ${client.connectOptions}
            client.MAX_ATTEMPTS= ${client.MAX_ATTEMPTS}
            `
        );
    }
}
// --------------------creating a udp server --------------------

// creating a udp server
const serverUdp = udp.createSocket('udp4');

// emits when any error occurs
serverUdp.on('error', function (error) {
    console.log('Error: ' + error);
    serverUdp.close();
});

// emits on new datagram msg
serverUdp.on('message', function (msg, info) {
    //console.log('Data received from client : ' + msg.toString());
    let diff = Date.now();
    let data = JSON.parse(msg.toString('utf-8'));
//console.log('msg :',data); 
    diff = diff - parseInt(data.time);
    console.log(`UDP mashine = ${data.mashine} ${data.nameSocket} = ${data.closePrice} volume = ${data.volume} sent = ${diff} ms`);
    //console.log('Received %d bytes from %s:%d\n',msg.length, info.address, info.port);

    //sending msg
    /* serverUdp.send(Buffer((Date.now() - diff).toString()), info.port, 'localhost', function (error) {
        if (error) {
            client.close();
        } else {
            //console.log('Data sent !!!');
        }

    }); */

});

//emits when socket is ready and listening for datagram msgs
serverUdp.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
serverUdp.on('close', function () {
    console.log('Socket is closed !');
});
serverUdp.bind(9999); 
/* serverUdp.bind({
    address: '0.0.0.0',
    port: 9999
}, (err) => {
    !!err && console.error(err);
}); */
