const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');
const assert = require('assert');

contract('Flight Surety Tests', async (accounts) => {

  let config;
  let flightTimestamp;
  let flightCode = 'CODE1';

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, { from: config.owner });
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, 'Incorrect initial operating status value');
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, 'Access not restricted to Contract Owner');
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, 'Access not restricted to Contract Owner');
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    let reverted = false;
    try {
      await config.flightSuretyData.authorizeCaller(config.firstAirline, { from: config.owner });
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, 'Access not blocked for requireIsOperational');

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) register airline directly without need of a consensus', async () => {
    const funds = await config.flightSuretyData.MINIMUM_FUNDS.call();

    try {
      await config.flightSuretyApp.fundAirline({ from: config.owner, value: funds });
      await config.flightSuretyApp.registerAirline('Udacity Airline', config.firstAirline, { from: config.owner });
    } catch (e) {
      console.log(e);
    }

    let airlinesCount = await config.flightSuretyData.airlinesCount.call();
    let result = await config.flightSuretyData.airlineExists.call(config.firstAirline);

    assert.equal(airlinesCount, 2, `Airlines count should be 2, got ${airlinesCount}`);
    assert.equal(result, true, 'Airline should be able to register another airline directly if there are less than 4 registered');
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    let newAirline = accounts[7];

    let reverted = false;
    try {
      await config.flightSuretyApp.registerAirline('Udacity Airline 2', newAirline, { from: config.firstAirline });
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, 'Airline should not be registered');

    let result = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);
    assert.equal(result, false, 'Airline should not be able to register another airline if it has not provided funding');
  });

  it('(airline) register other airline using consensus', async () => {
    const funds = await config.flightSuretyData.MINIMUM_FUNDS.call();

    try {
      await config.flightSuretyApp.registerAirline('Udacity Airline 3', accounts[2], { from: config.owner });
      await config.flightSuretyApp.registerAirline('Udacity Airline 4', accounts[3], { from: config.owner });
      await config.flightSuretyApp.registerAirline('Udacity Airline 5', accounts[4], { from: config.owner });
    } catch (e) {
      console.log(e);
    }

    let isRegistered = await config.flightSuretyApp.isAirlineRegistered.call(accounts[4]);
    assert.equal(isRegistered, false, 'Airline should wait to get votes');

    let airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(airlinesCount, 4, `Airlines count should be 4 - one waiting for votes: expected ${4} got ${airlinesCount}`);

    // fund another airline
    await config.flightSuretyApp.fundAirline({ from: config.firstAirline, value: funds });
    // register same airline using another airline
    await config.flightSuretyApp.registerAirline('Udacity Airline 5', accounts[4], { from: config.firstAirline });

    isRegistered = await config.flightSuretyApp.isAirlineRegistered.call(accounts[4]);
    assert.equal(isRegistered, true, 'Airline should be registered');

    airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(airlinesCount, 5, 'Airlines count should be 5');
  });

  it('(airline) can register a flight using registerFlight()', async () => {
    flightTimestamp = Math.floor(Date.now() / 1000);

    await config.flightSuretyApp.registerFlight(flightCode, flightTimestamp, { from: config.firstAirline });

    let isRegistered = await config.flightSuretyApp.isFlightRegistered.call(flightCode, flightTimestamp, config.firstAirline);
    assert.equal(isRegistered, true, 'Flight should be registered');
  });

  it('(passenger) may pay up to 1 ether for purchasing flight insurance.', async () => {
    const price = await config.flightSuretyData.INSURANCE_PRICE_LIMIT.call();

    await config.flightSuretyApp.insureFlight(
      config.firstAirline,
      flightCode,
      flightTimestamp,
      { from: config.firstPassenger, value: price },
    );

    const insuredPassenger = await config.flightSuretyApp.isPassengerInsured.call(
      config.firstAirline,
      flightCode,
      flightTimestamp,
      { from: config.firstPassenger },
    );
    assert.equal(insuredPassenger, true, 'Passenger should be insured.');
  });

  it('(passenger) cannot register for the same flight twice', async () => {
    const price = await config.flightSuretyData.INSURANCE_PRICE_LIMIT.call();

    let error = false;
    try {
      await config.flightSuretyApp.insureFlight(
        config.firstAirline,
        flightCode,
        flightTimestamp,
        { from: config.firstPassenger, value: price },
      );
    } catch (e) {
      error = true;
    }

    assert.equal(error, true, "passenger 1 should not be able to insure twice for the same flight");
  });

  xit('(passenger) if flight is late credit passenger', async () => {
    let firstAirline = accounts[0];
    let passenger1 = accounts[7];
    let errorZeroBalance = false;

    try {
      await config.flightSuretyApp.withdrawCredits({ from: config.firstPassenger });
    } catch (e) {
      errorZeroBalance = true;
    }
    assert.equal(errorZeroBalance, true, "Should not be able to withdraw money with no credit balance");

    let firstPassengerBalance = await config.flightSuretyApp.getPassengerCreditBalance.call({ from: config.firstPassenger });
    assert.equal(firstPassengerBalance, 0, "passenger 1 should have no credit");

    try {
      await config.flightSuretyApp.processFlightStatus(accounts[2], flightCode, flightTimestamp, config.STATUS_CODE_LATE_AIRLINE);
    } catch (e) {
      console.log(e.message);
    }

    try {
      await config.flightSuretyApp.withdrawCredits({ from: passenger1 });
    } catch (e) {
      console.log(e.message);
    }
    passenger1_balance = await config.flightSuretyApp.getPassengerCreditBalance.call({ from: passenger1 });
    assert.equal(passenger1_balance, 0, "passenger should have 0 ether after calling pay");
  });

});
