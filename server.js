const net = require('toa-net')

const pricesFromExchanges = [];
const exchanges = [];
const priceTable = {};
const auth = new net.Auth('secretxxx')
let tmpMessage;


const server = new net.Server(function (socket) {
    socket.on('message', (message) => {
        //console.log('message :', message);
        // { payload: { jsonrpc: '2.0', method: 'hello', params: [ 1 ] },
        //   type: 'notification' }
        // showPrice(message);
        if (message.type === 'notification') {
            let diff = Date.now() - parseInt(message.payload.params[4]) + parseInt(message.payload.params[3]);
            console.log(`timeStamp ${message.payload.method} = ${diff} ms`);
            parseMessage(message);
            showPrice(priceTable);
        }
        if (message.type === 'request') {
            setNewMessage(message);
 
            startClient(message.payload.params)
            // echo request 
            socket.success(message.payload.id, message.payload.params)
        }
    })
})
server.listen(8000)
function setNewMessage(message) {
    //console.log('message!! :', message);
    tmpMessage = message;
}
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


    //console.log(' pricesFromExchanges:', pricesFromExchanges);
    priceTable[message.payload.method] = message.payload.params[0];


}

function showPrice(prices) {
    console.log('prices :', prices);
    //sendPrices(prices) 
}


function startClient({ serverPort = 0, url = 'localhost', exchange = 'Bittrex' }) {
    const newExchange = { serverPort, url, exchange }
    exchanges.push(newExchange);
    const client = new net.Client()
    // Enable authentication for client
    client.getSignature = function () {
        return auth.sign({ id: 'clientIdxxx' })
    } 
    try {
        const totalUrl = `tcp://${url}:${serverPort}`;
        client.connect(totalUrl);
        console.log('totalUrl :', totalUrl);
        client.notification('hello', [`+++++++${exchange} ${Date.now()}`])
    } catch (e) {
        console.log('err :', e);
    }
}
 