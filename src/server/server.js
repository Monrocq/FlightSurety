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
    console.log(event)
    const {index, airline, flight, timestamp} = event.returnValues;
    for (let i = 0; i < ORACLE_NB; i++) {
      const indexes = await flightSuretyApp.methods.getMyIndexes().call({from: web3.eth.accounts[i]})
      if (indexes.includes(index)) {
        const statusCode = index > 6 ? await flightSuretyApp.methods.STATUS_CODE_LATE_AIRLINE().call({from: web3.eth.accounts[i]}) : index * 10;
        await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from: web3.eth.accounts[i]})
      }
    }
});

async function init() {
  const oracleFee = await flightSuretyApp.methods.REGISTRATION_FEE().call({from: web3.eth.accounts[0]});
  for (let i = 0; i < ORACLE_NB; i++) {
    await flightSuretyApp.methods.registerOracle().call({from: web3.eth.accounts[i], value: oracleFee});
  }
}

init()

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


