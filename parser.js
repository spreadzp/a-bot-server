const cTable = require('console.table');
const emoji = require('node-emoji');
require('dotenv').config();

const orderBooks = {};
let result;
let profit = 0;

module.exports = {

    parseTcpMessage(data) {
        let exchangePair = data.payload.method.split(' ');
        let orderBook = data.payload.params[0];
        let host = data.payload.params[1];
        let port = data.payload.params[2];
        this.parseMessage(exchangePair, orderBook, host, port);
    },
    parseData(data) {
        let exchangePair = data.exchange.split(' ');
        let orderBook = data.orderBook;
        let host = data.host;
        let port = data.port;
        this.parseMessage(exchangePair, orderBook, host, port);
    },
    parseMessage(exchangePair, orderBook, host, port) {
        orderBooks.pair = exchangePair[1];
        let createdEchangeField = false;
        if (!orderBooks.orderBooksData && orderBook.bids !== undefined && orderBook.asks !== undefined) {
            orderBooks.orderBooksData = [
                {
                    exchange: exchangePair[0],
                    pair: exchangePair[1],
                    bids: orderBook.bids,
                    asks: orderBook.asks,
                    updateStatus: 4,
                    host: host,
                    port: port
                }
            ]
        }
        for (let i = 0; i < orderBooks.orderBooksData.length; i++) {
            if (orderBooks.orderBooksData[i].exchange == exchangePair[0]
                && orderBook.bids !== undefined && orderBook.asks !== undefined) {
                orderBooks.orderBooksData[i].pair = exchangePair[1];
                orderBooks.orderBooksData[i].bids = orderBook.bids;
                orderBooks.orderBooksData[i].asks = orderBook.asks;
                orderBooks.orderBooksData[i].updateStatus = 4;
                host = host;
                port = port;
                createdEchangeField = true
            } else {
                orderBooks.orderBooksData[i].updateStatus -= 1;
            }
        }
        if (!createdEchangeField) {
            if (orderBook.bids !== undefined && orderBook.asks !== undefined) {
                orderBooks.orderBooksData.push(
                    {
                        exchange: exchangePair[0],
                        pair: exchangePair[1],
                        bids: orderBook.bids,
                        asks: orderBook.asks,
                        updateStatus: 4,
                        host: host,
                        port: port
                    }
                )
            }


        }
    },
    getSocket(data) {
        const hostClient = data.host;
        const portClient = data.port;
        console.log(hostClient, portClient);
    },
    makeOrders() {
        this.showData();
        return this.defineSellBuy(result);

    },
    showData() {
        console.log('=======================================================================');

        result = orderBooks.orderBooksData.map(data => ({
            exchange: data.exchange, pair: data.pair,
            bid: data.bids[0][0], ask: data.asks[0][0], spread: ((data.asks[0][0] / data.bids[0][0]) - 1) * 100,
            status: data.updateStatus > 0, host: data.host, port: data.port
        }));
        const failExchangePrises = result.filter(this.isDisonnectedBot);
        if (failExchangePrises.length) {
            console.table(`${emoji.get('white_frowning_face')} Disconnected bots`, failExchangePrises);
            console.log(`${emoji.get('hammer_and_pick')}  <---------------------------------------------->  ${emoji.get('hammer_and_pick')}`);
        }
        console.table(result)
        console.log(`@@@@@@@@@@  PROFIT = ${profit}BTC`);
        //this.defineSellBuy(result);
    },
    defineSellBuy(result) {
        const maxPrise = this.arrayMax(result);
        const minPrise = this.arrayMin(result);
        const marketSpread = (maxPrise / minPrise - 1) * 100;


        //result.find(isDisonnectedBot);
        const sellExchange = result.find(findSellExchange);
        const buyExchange = result.find(findBuyExchange);
        function findBuyExchange(data) {
            return data.bid === minPrise;
        };
        function findSellExchange(data) {
            return data.ask === maxPrise;
        };
        let ordersBot;
        if (sellExchange && buyExchange && marketSpread > process.env.PERCENT_PROFIT) {
            profit += maxPrise - minPrise;
            console.log(`pair ${sellExchange.pair} sell: ${sellExchange.exchange}  ${maxPrise}  buy: ${buyExchange.exchange}  ${minPrise}  spread: ${marketSpread}%`);
            ordersBot = {
                seller: {
                    pair: sellExchange.pair,
                    exchange: sellExchange.exchange,
                    price: maxPrise,
                    volume: 0,
                    host: sellExchange.host,
                    port: sellExchange.port
                },
                buyer: {
                    pair: buyExchange.pair,
                    exchange: buyExchange.exchange,
                    price: minPrise,
                    volume: 0,
                    host: buyExchange.host,
                    port: buyExchange.port
                }
            }
        }
        return ordersBot;
    },

    isDisonnectedBot(data) {
        if (data.status) {
            return false;
        } else {
            console.error(`${emoji.get('fire')}<---------------------------------------------->${emoji.get('fire')}`);
            console.log(`from ${data.exchange} old data ${data.pair}, try reconnect ${data.host}:${data.port} ${emoji.get('exclamation')}`);
            return true;
        }

    },
    arrayMin(arr) {
        var len = arr.length, min = Infinity;
        while (len--) {
            if (Number(arr[len].bid) < min) {
                min = Number(arr[len].bid);
            }
        }
        return min;
    },
    arrayMax(arr) {
        var len = arr.length, max = -Infinity;
        while (len--) {
            if (Number(arr[len].ask) > max) {
                max = Number(arr[len].ask);
            }
        }
        return max;
    }
}
