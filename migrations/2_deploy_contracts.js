const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function (deployer) {

  const firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
  const firstAirlineName = 'Fast Airlines';
  deployer.deploy(FlightSuretyData, firstAirlineName)
    .then(() => {
      return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
        .then(() => {
          let config = {
            localhost: {
              url: 'http://localhost:9545',
              dataAddress: FlightSuretyData.address,
              appAddress: FlightSuretyApp.address,
            },
          }
          fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
          fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
        });
    });
}