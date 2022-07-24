import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = Config["flights"];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    initEvents(callback) {
        let self = this;
        self.flightSuretyApp.events.FlightStatusInfo({
            fromBlock: 0
        }, callback)
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getPassengers(callback) {
        callback(this.passengers)
    }

    async getFlights(callback) {
        let self = this
        for (let flight in self.flights) {
            let result = await self.flightSuretyApp.methods.getFlightKey(this.airlines[0], self.flights[flight].ref, self.flights[flight].timestamp).call({ from: self.owner})
            callback(result, flight)
        }
    }

    subscribeInsurance(from, flight, amount, callback) {
        let self = this;
        let timestamp;
        for (let index in this.flights) {
            if (flight == this.flights[index].ref) {
                timestamp = this.flights[index].timestamp
            }
        }
        self.flightSuretyData.methods.buy(this.airlines[0], flight, timestamp).send({from, value: amount * 1000000000000000}, callback)
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}