import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const ORACLE_NB = 20;

// input --> (index, airline, flight, timestamp)
// output --> (uint8 index, address airline, string flight, uint256 timestamp, uint8 statusCode)
flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, async function (error, event) {
  if (error) console.log(error)
  const accounts = await web3.eth.getAccounts()
  const {index, airline, flight, timestamp} = event.returnValues;
  for (let i = 0; i < ORACLE_NB; i++) {
    const indexes = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]})
    if (indexes.includes(index)) {
      const statusCode = index > 6 ? await flightSuretyApp.methods.STATUS_CODE_LATE_AIRLINE().call({from: accounts[i]}) : index * 10;
      const gas = await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).estimateGas({from: accounts[i]})
      await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from: accounts[i], gas})
    }
  }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


