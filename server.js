const net = require('toa-net');
const logger = require('./winston');
const udp = require('dgram');
const parser = require('./parser');
const pricesFromExchanges = [];
const exchanges = [];
const priceTable = {};
const auth = new net.Auth('secretxxx');
let client = null;

const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        if (message.type === 'notification') {
            parser.parseTcpMessage(message);
            const orders = parser.makeOrders();
            sendOrdersToBot(orders);
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

function createClient(clientSocket) {
    client = new net.Client()
    // Enable authentication for client
    client.getSignature = function () {
        return auth.sign({ id: 'clientIdxxx' })
    }
    client.connect(clientSocket);
}

function sendOrdersToBot(orders) {
    if (orders) {
        const parametersSellOrder = {
            serverPort: orders.seller.port, host: orders.seller.host,
            order: { pair: orders.seller.pair, price: orders.seller.price, volume: orders.seller.volume, typeOrder: 'sell' }
        }
        startClient(parametersSellOrder);
        const parametersBuyOrder = {
            serverPort: orders.buyer.port, host: orders.buyer.host,
            order: { pair: orders.buyer.pair, price: orders.buyer.price, volume: orders.buyer.volume, typeOrder: 'buy' }
        }
        startClient(parametersBuyOrder);
    }
}

function startClient(order) {
    try {
        const clientSocket = `tcp://${order.host}:${order.serverPort}`;
        createClient(clientSocket);
        client.on('error', (err) => {
            //console.log('err.trace :', err); 
            if (err.code === 'ETIMEDOUT') {
                client.destroy();
            }
            //createClient(clientSocket);
            clientReconnection(clientSocket)
        });
        const stringOrder = JSON.stringify(order.order);
        client.notification('sendOrder', [`${stringOrder}`])
    } catch (e) {
        console.log('err :', e);

    } finally {
        //client.destroy();
    }

    function clientReconnection(clientSocket) { 
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
