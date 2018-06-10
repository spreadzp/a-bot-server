const net = require('toa-net')
const logger = require('./winston');

const pricesFromExchanges = [];
const exchanges = [];
const priceTable = {};
const auth = new net.Auth('secretxxx');
let client = null;

const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        // { payload: { jsonrpc: '2.0', method: 'hello', params: [ 1 ] },
        //   type: 'notification' } 
        if (message.type === 'notification') {
            let diff = Date.now() - parseInt(message.payload.params[4]) + parseInt(message.payload.params[3]);
            console.log(`timeStamp ${message.payload.method} = ${diff} ms`);
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
    console.log('prices :', prices);
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
            console.log('err.trace :', err.trace);
            client.reconnect();
        });
        client.notification('hello', [`+++++++${exchange} ${Date.now()}`])
    } catch (e) {
        console.log('err :', e);
    } finally {
        //client.destroy();
    }

    function startConnection(clientSocket) {
        console.log('client try connecting to port :', clientSocket);
        client.connect(clientSocket)
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
