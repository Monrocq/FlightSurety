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
                        }
                    }
                    await data.setAppContract(config.localhost.appAddress)
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
                        await app.initOracle(accounts[account], indexes)
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
}