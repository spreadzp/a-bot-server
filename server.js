const net = require('toa-net')
const logger = require('./winston');

const pricesFromExchanges = [];
const exchanges = [];
const priceTable = {};
const auth = new net.Auth('secretxxx');
let client = null;

const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        if (message.type === 'notification') {
            let diff = Date.now() - parseInt(message.payload.params[4]) + parseInt(message.payload.params[3]);
            if (Number.isInteger(diff)) {
                console.log(`timeStamp ${message.payload.method} = ${diff} ms`);
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
            if(err.code ==='ETIMEDOUT') {
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

var ipc=require('node-ipc');
 
    ipc.config.id   = 'server';
    ipc.config.retry= 1500;
 
    ipc.serveNet( 
        '18.196.15.151',
        9999,
        'udp4',
        function(){
            console.log(123);
 
            ipc.server.on(
                'time',
                function(data,socket){
                    ipc.log('got a message from '.debug, data.from.variable ,' : '.debug, data.message.variable);
                    ipc.server.emit(
                        socket, 
                        'time',
                        {
                            from    : ipc.config.id,
                            message : Date.now() - parseInt(data.message)
                        }
                    );
                }
            );
 
            console.log(ipc.server);
        }
    );
 
    ipc.server.start();
