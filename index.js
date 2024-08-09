const express = require('express');
const axios = require('axios').default;
const Redis = require("ioredis")
const client = new Redis("rediss://default:AeQcAAIjcDE0MjMyYTMzNDEwYzc0Y2ZiOWFkMzk1M2JlZTgwM2IwMHAxMA@helpful-polliwog-58396.upstash.io:6379");
const quantity = 1;
let applied_quantity = quantity
const access_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzIzMjQxNjA2LCJ0b2tlbkNvbnN1bWVyVHlwZSI6IlNFTEYiLCJ3ZWJob29rVXJsIjoiIiwiZGhhbkNsaWVudElkIjoiMTEwMzg1MDMyMCJ9.yCMQ2IZnz6f8Rw8Aky_ixJkxsMSeZAgcEvzkSvomk1iiZvJawlhAFx0bcZDdkFT5aKgG3TfSqzgQbAzXxpqHSQ"
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const placeOrder = async (tradingSymbol, transactionType, securityId, quantity) => {
console.log(tradingSymbol, transactionType, securityId, quantity);
const options = {
  method: 'POST',
  url: 'https://api.dhan.co/orders',
  headers: {
    'access-token': access_token,
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

const check_positions = async (symbol, t_type) => {
  console.log("check_positions",symbol);

    const options = {
        method: 'GET',
        url: 'https://api.dhan.co/positions',
        headers: {
          'access-token': access_token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
    }
    try {
        const { data } = await axios.request(options);
        // if(data.length==0) return false
        //filter positions with symbol and check if positions are ok or not [To Be DONE...]
        // console.log(data, quantity);
        const position = (data.filter(position => position.tradingSymbol === symbol))[0].netQty; 
        console.log(67,position);//filter positions with symbol and check if positions are ok or not [To Be DONE...] and return data.
        if(t_type == 'BUY' && position == -quantity) return true
        else if(t_type == 'SELL' && position == quantity) return true
        return false //change this hard coded value [To Be DONE...]
      } catch (error) {
        console.error(error);
      }
}

const check_entry_positions = async (symbol) => {
  console.log("check_entry_positions",symbol);
  const options = {
      method: 'GET',
      url: 'https://api.dhan.co/positions',
      headers: {
        'access-token': access_token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
  }
  try {
      const { data } = await axios.request(options);
      //filter positions with symbol and check if positions are ok or not [To Be DONE...]
      const position = (data.filter(position => position.tradingSymbol === symbol))[0]; 
      if(!position || position.netQty==0) return true
      // console.log(data, quantity);
      return false; //change this hard coded value [To Be DONE...]
    } catch (error) {
      console.error(error);
    }
}

const Squaring_off = async (symbol) => {
  const options = {
    method: 'GET',
    url: 'https://api.dhan.co/positions', 
    headers: {
      'access-token': access_token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }
  try {

    const { data } = await axios.request(options);
    console.log("object",data);
      const position = (data.filter(position => position.tradingSymbol === symbol))[0];
      console.log("position",position);
      if(position.netQty > 0) {
        await placeOrder(symbol, "SELL", position.securityId, position.netQty);
      }else if(position.netQty < 0){
        await placeOrder(symbol, "BUY", position.securityId, -position.netQty);
      }else{
        return true 
      }
      //filter positions with symbol and square off all positions [To Be DONE...]
      return true //return true if all suqre off orders are placed successfully [To Be DONE...]
    } catch (error) {
      console.error(error);
    }
}
      

app.post('/place-order', async(req, res) => {
    try {
        const config = req.body.config;
        //check if market is open or not 
        const market_status = await client.get("market_open") ; 
        if(!parseInt(market_status)==1) {
          console.log("Market Closed");
          return res.status(400).send("Market Closed");
        }
        //check if the symbol and other parameters are valid or not
        // convert that csv to json 
        // get data [securityId] of that symbol from that file and check if it exist or not
        //[To Be DONE...]

        if(!config){
            console.log("Invalid symbol");
           return res.status(400).send("1 Invalid symbol");
          }
       
        const prev=await client.get(config[0])
        if(!prev){
          await client.set(config[0], 0);
        }
        // if(!prev){
        //     console.log("Invalid symbol");
        //    return res.status(400).send("Invalid symbol");
        // }
        if( parseInt(prev)==1){
             //check if the positions are ok or not
             const position_ok = await check_positions(config[0],config[1])
             console.log(position_ok);
            if(!position_ok) {
                //square off position for this token 
                const squareed_off = await Squaring_off(config[0])
            await client.set(config[0], 0);

                if(squareed_off){
                  console.log("positions are messed up. Strategy stoped! All positions are Squared off! for : "+config[0]);
                  return res.status(400).send("positions are messed up. Strategy stoped! All positions are Squared off! for : "+config[0]);
                }else{
                  console.log("1 positions are messed up. Strategy stoped! for : "+config[0]+"error in squaring off positions");
                  return res.status(400).send("positions are messed up. Strategy stoped! for : "+config[0]+"error in squaring off positions");
                }
            }
            applied_quantity=quantity*2
        }
        else{
            const position_ok = await check_entry_positions(config[0])
            if(!position_ok) {
              await client.set(config[0], 1);
              applied_quantity=quantity
              //log that the stratigy has started for this token
              console.log("The stratigy has started for : "+config[0]);
            }
        }
        const resp =await placeOrder(...config,applied_quantity);

        console.log("Order Placed for : "+config + " with quantity : "+applied_quantity);
        await client.set(config[0], 1);

        if(!check_positions(config[0])) {
            //square off position for this token 
            const squareed_off = await Squaring_off(config[0])
            await client.set(config[0], 0);
            if(squareed_off){
              console.log("positions are messed up. Strategy stoped! All positions are Squared off! for : "+config[0]);
              return res.status(400).send("positions are messed up. Strategy stoped! All positions are Squared off! for : "+config[0]);
            }else{
              console.log("2 positions are messed up. Strategy stoped! for : "+config[0]+"error in squaring off positions");
              return res.status(400).send("positions are messed up. Strategy stoped! for : "+config[0]+"error in squaring off positions");
            }
          }
        res.status(200).send("ok");
    } catch (error) {
        console.log(error);
    }

});

app.get("/market-toggle",async ( res)=>{
  console.log("object");
  const market_status = await client.get(); 
  console.log("market_status",market_status);
  if(parseInt(market_status)==1){
    await client.set("market_open",0)
    return res.send("Market Closed")
  }else{
    await client.set("market_open",1)
    return res.send("Market opened")
  }

})

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


//5, 6, 7, 8, 9, 10 ,11, 12, 1, 2, 3, 4
//c2t-equity  test&update-ranko