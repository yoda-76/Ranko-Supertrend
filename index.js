const express = require('express');
const axios = require('axios').default;
const Redis = require("ioredis")
const client = new Redis("rediss://default:AeQcAAIjcDE0MjMyYTMzNDEwYzc0Y2ZiOWFkMzk1M2JlZTgwM2IwMHAxMA@helpful-polliwog-58396.upstash.io:6379");

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const placeOrder = async (tradingSymbol, transactionType, securityId, quantity) => {

const options = {
  method: 'POST',
  url: 'https://api.dhan.co/orders',
  headers: {
    'access-token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzIyNjE0MTExLCJ0b2tlbkNvbnN1bWVyVHlwZSI6IlNFTEYiLCJ3ZWJob29rVXJsIjoiaHR0cDovL2xvY2FsaG9zdDo1MDAwIiwiZGhhbkNsaWVudElkIjoiMTEwMzg1MDMyMCJ9.JwJEBNGZypOcFM6QGTDWNtWf1qVnoDfvmZ0WT7CAbyNgFcMaw_xbQu1pxh6jDRa5mJNAsw0OL2i8plRwaw3DbA',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  data: {
    dhanClientId: '1103850320',
    transactionType,
    exchangeSegment: 'NSE_EQ',
    productType: 'INTRADAY',
    orderType: 'MARKET',
    validity: 'DAY',
    tradingSymbol,
    securityId,
    quantity,
    disclosedQuantity: 0,
    price: 0
  }
};

try {
  const { data } = await axios.request(options);
  console.log(data);
  return data
} catch (error) {
  console.error(error);
}
};


app.post('/place-order', async(req, res) => {
    const config = req.body.config;
    if(!config) return res.status(400).send("Invalid symbol")
    try {
        const prev=await client.get(config[0])
        if(parseInt(prev)==1){
            const resp =await placeOrder(...config,2);
        }
        else{
            await client.set(config[0], 1);
            const resp =await placeOrder(...config,1);
        }
        res.status(200).send("ok");
    } catch (error) {
        console.log(error);
    }

});

app.listen(5000, ()=>{
    console.log("Server is running on port 5000");
});


// {
//     dhanClientId: '1103850320',
//     transactionType: 'BUY',
//     exchangeSegment: 'NSE_EQ',
//     productType: 'INTRADAY',
//     orderType: 'MARKET',
//     validity: 'DAY',
//     tradingSymbol: symbol,
//     securityId: '11915',
//     quantity: 1,
//     disclosedQuantity: 0,
//     price: 0
//   }