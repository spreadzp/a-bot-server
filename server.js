const net = require('toa-net');
const logger = require('./winston');
var uniqid = require('uniqid');
const parser = require('./parser');
const auth = new net.Auth('secretxxx');
let client = null;

const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        if (message.type === 'notification' && message.payload.method === 'responseOrder') {
            parser.parseSentOrder(message);
        }
        if (message.type === 'request') {
            startClient(message.payload.params)
            // echo request 
            socket.success(message.payload.id, message.payload.params)
        } else {
            parser.parseTcpMessage(message);
            const orders = parser.makeOrders();
            sendOrdersToBot(orders);
        }
    })
})
server.listen(8000)

// Enable authentication for server
server.getAuthenticator = function () {
    return (signature) => auth.verify(signature)
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
        const arbitrageId = uniqid();
        console.log('arbitrageId :', arbitrageId);

        if (orders.seller !== undefined) {
            const parametersSellOrder = {
                serverPort: orders.seller.port, host: orders.seller.host,
                order: {
                    pair: orders.seller.pair, price: orders.seller.price,
                    volume: orders.seller.volume, typeOrder: 'sell', arbitrageId: arbitrageId
                }
            }
            startClient(parametersSellOrder);
        }
        if (orders.buyer !== undefined) {
            const parametersBuyOrder = {
                serverPort: orders.buyer.port, host: orders.buyer.host,
                order: { pair: orders.buyer.pair, price: orders.buyer.price, volume: orders.buyer.volume, typeOrder: 'buy', arbitrageId: arbitrageId }
            }
            startClient(parametersBuyOrder);
        }

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
