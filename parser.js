
const cTable = require('console.table');
const orderBooks = {};

module.exports = { 
    
    parseData(data) {
        let exchangePair = data.exchange.split(' ');
        orderBooks.pair = exchangePair[1];
        let createdEchangeField = false;
        if (!orderBooks.orderBooksData) {
            //&& data.orderBook.bids == undefined && data.orderBook.asks == undefined
            orderBooks.orderBooksData = [
                {
                    exchange: exchangePair[0],
                    pair: exchangePair[1],
                    bids: data.orderBook.bids,
                    asks: data.orderBook.asks
                }
            ]
        }
        for (let i = 0; i < orderBooks.orderBooksData.length; i++) {
            if (orderBooks.orderBooksData[i].exchange == exchangePair[0]) {
                orderBooks.orderBooksData[i].pair = exchangePair[1],
                    orderBooks.orderBooksData[i].bids = data.orderBook.bids
                orderBooks.orderBooksData[i].asks = data.orderBook.asks;
                createdEchangeField = true;
            }
        }
        if (!createdEchangeField) {
            orderBooks.orderBooksData.push(
                {
                    exchange: exchangePair[0],
                    pair: exchangePair[1],
                    bids: data.orderBook.bids,
                    asks: data.orderBook.asks,
                }
            )

        }
    },
    getSocket(data) {
        const hostClient = data.host;
        const portClient = data.port;
        console.log(hostClient, portClient);
    },
    showData() {

        console.log('============================================= :');
        let result;
        //try {
        result = orderBooks.orderBooksData.map(data => ({ exchange: data.exchange, asset: data.pair, bid: data.bids[0][0], ask: data.asks[0][0], spread: ((data.asks[0][0] / data.bids[0][0]) - 1) * 100 }));
        /*  } catch (e) {
             console.log('data fail:', data);
             console.log('err :', e);
         } */

        console.table(result)
        function arrayMin(arr) {
            var len = arr.length, min = Infinity;
            while (len--) {
                if (Number(arr[len].bid) < min) {
                    min = Number(arr[len].bid);
                }
            }
            console.log('min :', min);
            return min;
        };

        function arrayMax(arr) {
            var len = arr.length, max = -Infinity;
            while (len--) {
                if (Number(arr[len].ask) > max) {
                    max = Number(arr[len].ask);
                }
            }
            console.log('max :', max);
            return max;
        };
        const maxPrise = arrayMax(result);
        const minPrise = arrayMin(result);
        const marketSpread = (maxPrise / minPrise - 1) * 100;

        function findBuyExchange(data) {
            return data.bid === minPrise;
        }
        function findSellExchange(data) {
            return data.ask === maxPrise;
        }
        const sellExchange = result.find(findSellExchange);
        const buyExchange = result.find(findBuyExchange);
        console.log(`pair ${sellExchange.asset} sell: ${sellExchange.exchange}  ${maxPrise}  buy: ${buyExchange.exchange}  ${minPrise}  spread: ${marketSpread}%`);


    }
}
