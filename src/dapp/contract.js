import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.availableAccounts = [];
        this.airlines = {};
        this.passengers = {};
        this.flights = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            this.activeAccount = accts[0];

            for (let i=0; i<30; i++){
                this.availableAccounts.push(accts[i])
            }

            this.airlines['RyanAir'] = accts[0];
            this.airlines['WizzAir'] = accts[1];
            this.airlines['LOT'] = accts[2];
            this.airlines['Lufthansa'] = accts[3];
            this.airlines['TurkishAir'] = accts[4];
            this.airlines['KLM'] = accts[5];
            this.airlines['EnterAir'] = accts[6];

            this.passengers['Tomek Elo'] = accts[7];
            this.passengers['Mateusz Broa'] = accts[8];
            this.passengers['Wieslaw Motyl'] = accts[9];
            this.passengers['Zdzislawa Kedzierzawa'] = accts[10];
            this.passengers['Anna Klawa'] = accts[11];
            this.passengers['Mateusz Borsuk'] = accts[12];

            this.flights = [
                'LAI-ABE',
                'DHA-LCY',
                'LCY-DHA',
                'ABE-LAI',
                'BRU-BER',
                'BER-BRU',
                'SFO-JFK',
                'FKS-HKG',
                'BER-HKG',
                'YWG-YYC',
                'JFK-SFO',
                'CPT-CRK',
                'LAI-HGK',
                'CRK-CPT',
                'HKG-BER',
            ];

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    toggleOperatingStatus(newStatus, callback){
        let self = this;
        self.flightSuretyApp.methods
          .setOperatingStatus(newStatus)
          .send({ from: self.owner}, callback);
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

    registerAirline(airline, callback){
        let self = this;
        self.flightSuretyApp.methods
          .registerAirline(airline)
          .send({ from: self.activeAccount}, (error, result) => {
              callback(error, result);
          });
    }

    fundAirline(value, callback){
        let self = this;
        self.flightSuretyApp.methods
          .fundAirline()
          .send({ from: self.activeAccount, value: self.web3.utils.toWei(value, 'ether')}, (error, result) => {
              callback(error, result);
          });
    }

    registerFlight(flightid, callback){
        console.log(flightid);
        let self = this;
        let timestamp = Math.floor(Date.now() / 1000);
        let airline = self.activeAccount;
        self.flightSuretyApp.methods
          .registerFlight(flightid, timestamp)
          .send({ from: self.activeAccount}, (error, result) => {
              console.log(error);
              if(!error){
                  result = `success ${flightid} ${airline} ${timestamp}`;
                  console.log(result);
                  this.flightsAvailable.push([flightid,airline,timestamp]);
              }
              callback(error, result);
          });
    }

    insureFlight(tuple, value, callback){
        let self = this;
        let res = tuple.split(",");
        let payload = {
            airline: res[1],
            flight: res[0],
            timestamp: res[2]
        }
        self.flightSuretyApp.methods
          .InsureFlight(payload.airline,payload.flight,payload.timestamp)
          .send({ from: self.activeAccount, value: self.web3.utils.toWei(String(value), 'ether')}, (error, result) => {
              console.log(error);
              if(!error){
                  console.log(result);
              }
              callback(error, result);
          });
    }

    withdrawCredits(callback){
        let self = this;
        self.flightSuretyApp.methods
          .withdrawCredits()
          .send({ from: self.activeAccount}, (error, result) => {
              console.log(error);
              if(!error){
                  console.log(result);
              }
              callback(error, result);
          });
    }

    getPassengerCreditBalance(callback){
        let self = this;
        self.flightSuretyApp.methods
          .getPassengerCreditBalance()
          .call({ from: self.activeAccount}, (error, result) => {
              callback(error, result);
          });
    }

    registerOracle(index, callback){
        let self = this;
        self.flightSuretyApp.methods
          .registerOracle()
          .send({ from: self.availableAccounts[index], value: self.web3.utils.toWei('1', 'ether') }, (error, result) => {
              callback(error, result);
          });
    }
}