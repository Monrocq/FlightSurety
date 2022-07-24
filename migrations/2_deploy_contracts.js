const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const accounts = require('../config/accounts.json')
const fs = require('fs');

module.exports = function(deployer) {
    let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
    console.log(accounts)
    deployer.deploy(FlightSuretyData, firstAirline)
    .then(data => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async app => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        },
                        flights: []
                    }
                    //App contract address setter on data contract
                    await data.setAppContract(config.localhost.appAddress)
                    //Init oracles
                    for (let account in accounts) {
                        let indexes = []
                        const generateIndex = () => Math.floor(Math.random()*9)
                        for (let i = 0; i < 3; i++) {
                            let index;
                            do {
                                index = generateIndex()
                            } while(indexes.includes(index))
                            indexes.push(index)
                        }
                        console.log(indexes)
                        await app.initOracle(accounts[account], indexes)
                    }
                    //Init flights
                    for (let i = 1; i <= 10; i++) {
                        const ref = `XXXXX${i}`
                        const departure = `city${i}`
                        const timestamp = Date.now()
                        const key = await app.registerFlight(firstAirline, ref, timestamp)
                        config.flights.push({key, ref, departure, timestamp})
                    }
                    //Create config files
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
}