const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');
const assert = require('assert');

contract('Flight Surety Tests', async (accounts) => {

  let config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, 'Incorrect initial operating status value');
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, 'Access not restricted to Contract Owner');

  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, 'Access not restricted to Contract Owner');

  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
      let reverted = false;
      try
      {
          await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, 'Access not blocked for requireIsOperational');

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

      const isOperational = await config.flightSuretyData.isOperational.call();
      assert.equal(isOperational, true, 'Contract should be operational');
  });

  it('(airline) register airline directly without need of a consensus', async () => {

    // ARRANGE
    const funds = await config.flightSuretyData.MINIMUM_FUNDS.call();

    // ACT
    try {
      await config.flightSuretyData.fund({from: config.owner, value: funds});
      await config.flightSuretyData.registerAirline('Udacity Airline', config.firstAirline, { from: config.owner });
    }
    catch(e) {
      // console.log(e);
    }
    let airlinesCount = await config.flightSuretyData.airlinesCount.call();
    let result = await config.flightSuretyData.isAirline.call(config.firstAirline);

    // ASSERT
    assert.equal(airlinesCount, 2, `Airlines count should be 2.`);
    assert.equal(result, true, "Airline should be able to register another airline directly if there are less than 4 registered");
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyData.registerAirline('Udacity Airline 2', newAirline, {from: config.firstAirline});
    }
    catch(e) {}
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, 'Airline should not be able to register another airline if it has not provided funding');
  });

  it('(airline) register other airline using consensus', async () => {
    try {
      await config.flightSuretyData.registerAirline('Udacity Airline 3', accounts[2], {from: config.owner});
      await config.flightSuretyData.registerAirline('Udacity Airline 4', accounts[3], {from: config.owner});
      await config.flightSuretyData.registerAirline('Udacity Airline 5', accounts[4], {from: config.owner});
    }
    catch(e) { console.log(e); }

    let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
    let airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(result, false, 'Airline should wait to get votes');
    assert.equal(airlinesCount, 4, "Airlines count should be 4 - one waiting for votes");

    await config.flightSuretyData.vote(accounts[4]);
    result = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
    airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(result, true, 'Airline should be registered');
    assert.equal(airlinesCount, 5, "Airlines count should be 5");
  });
});
