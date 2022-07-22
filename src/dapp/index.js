import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

  let result = null;

  let contract = new Contract('localhost', () => {

    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      let status = DOM.elid('operational-status');
      status.innerText = result;
    });

    DOM.elid('btn-operational-status').addEventListener('click', () => {
      let status = DOM.elid('operational-status');
      contract.isOperational((error, result) => {
        if (error) {
          console.log('isOperational error: ' + error);
        }
        status.innerText = result;
      });
    });

    DOM.elid('btn-refresh-status').addEventListener('click', () => {
      refreshAccountInfo();
    })

    DOM.elid('available-accounts').addEventListener('change', () => {
      refreshAccountInfo();
    })

    DOM.elid('btn-operational-toggle').addEventListener('click', () => {
      let status = DOM.elid('operational-status');
      let newStatus = true;
      if (status.innerText === 'true') {
        newStatus = false;
      }
      contract.toggleOperatingStatus(newStatus, (error, result) => {
        if (error) {
          console.log('toggleOperatingStatus error: ' + error);
        }
        contract.isOperational((error, result) => {
          if (error) {
            console.log('isOperational error: ' + error);
          }
          status.innerText = result;
        });
      });
    });

    // fill in selection menus
    let airlineselect = DOM.elid("airline");
    for (let key in contract.airlines) {
      airlineselect.add(DOM.makeElement("option", { innerText: key }));
    }

    let accountselect = DOM.elid("available-accounts");
    for (let i = 0; i < contract.availableAccounts.length; i++) {
      accountselect.add(DOM.makeElement("option", { innerText: contract.availableAccounts[i] }));
    }

    let flightselect = DOM.elid("flight-select");
    for (let i = 0; i < contract.flights.length; i++) {
      flightselect.add(DOM.makeElement("option", { innerText: contract.flights[i] }));
    }

    refreshAccountInfo();

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let tuple = DOM.elid('registered-flight-select').value;
      contract.fetchFlightStatus(tuple, (error, result) => {
        displayInsuranceMessage('Status', error, `${result.flight} , ${result.airline}, ${result.timestamp}`);
      });
    })

    DOM.elid('btn-flights-register').addEventListener('click', () => {
      let flightId = DOM.elid('flight-select').value;
      contract.registerFlight(flightId, (error, result) => {
        displayFlightMessage('Register: ', error, result);
        let flightSelect = DOM.elid("registered-flight-select");
        for (let i = flightSelect.options.length - 1; i >= 0; i--) {
          flightSelect.remove(i);
        }
        for (let i = 0; i < contract.flights.length; i++) {
          flightSelect.add(DOM.makeElement("option", { innerText: contract.flights[i] }));
        }
      });

    })

    DOM.elid('btn-purchase-insurance').addEventListener('click', () => {
      let tuple = DOM.elid('registered-flight-select').value;
      let insuranceAmount = DOM.elid('insurance-amount').value;
      contract.insureFlight(tuple, insuranceAmount, (error, result) => {
        displayInsuranceMessage('Insure: ', error, result);
      });

    })

    DOM.elid('btn-withdraw-funds').addEventListener('click', () => {
      contract.withdrawCredits((error, result) => {
        displayInsuranceMessage('Withdraw: ', error, result);
      });

    })

    DOM.elid('btn-airline-register').addEventListener('click', () => {
      let airlineName = DOM.elid('airline').value;
      let airlineAddress = contract.airlines[airlineName];
      // Write transaction
      contract.registerAirline(airlineName, airlineAddress, (error, result) => {
        if (error) {
          console.log(`registerAirline name ${airlineName} address ${airlineAddress} error: ${error}`);
        }
        displayAirlineMessage('Register:', error, result);
      });
      refreshAccountInfo();
    })

    DOM.elid('btn-register-oracles').addEventListener('click', () => {
      let count = DOM.elid('oracle-count').value;
      // Write transaction

      for (let i = 0; i < count; i++) {
        contract.registerOracle(i, (error, result) => {
          displayInsuranceMessage('Registered:', error, result);
        });
      }
      refreshAccountInfo();
    })

    DOM.elid('btn-airline-fund').addEventListener('click', () => {
      let value = DOM.elid('fund-amount').value;
      // Write transaction
      contract.fundAirline(value, (error, result) => {
        displayAirlineMessage('Fund:', error, result);
      });
      refreshAccountInfo();
    })

    function refreshAccountInfo() {
      contract.activeAccount = DOM.elid('available-accounts').value;
      DOM.elid('acc-address').innerText = contract.activeAccount;
      contract.isAirlineRegistered(contract.activeAccount, (error, result) => {
        if (error) {
          console.log('isAirlineRegistered error: ' + error);
        }
        DOM.elid('acc-registered').innerText = result;
      });
      contract.isAirlineFunded((error, result) => {
        if (error) {
          console.log('isAirlineFunded error: ' + error);
        }
        DOM.elid('acc-funded').innerText = result;
      });
      contract.getPassengerCreditBalance((error, result) => {
        if (error) {
          console.log('getPassengerCreditBalance error: ' + error);
        }
        DOM.elid('acc-credit').innerText = result;
      });
      contract.web3.eth.getBalance(contract.activeAccount, (error, result) => {
        if (error) {
          console.log('getBalance error: ' + error);
        }
        DOM.elid('acc-balance').innerText = result;
      });
      DOM.elid('acc-owner').innerText = contract.owner;
    }
  });

})();


function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: 'row' }));
    row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
    row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
    section.appendChild(row);
  })
  displayDiv.append(section);

}

function displayAirlineMessage(label, error, result) {
  let displayDiv = DOM.elid("airline-messages");
  let section = DOM.section();
  let row = section.appendChild(DOM.div({ className: 'row' }));
  row.appendChild(DOM.div({ className: 'col-sm-1 field' }, label));
  if (error) {
    console.log('isAirlineRegistered error: ' + error);
  }
  row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, String(result)));
  section.appendChild(row);
  displayDiv.append(section);
  if (displayDiv.childElementCount > 3) {
    displayDiv.removeChild(displayDiv.firstChild);
  }
}

function displayFlightMessage(label, error, result) {

  let displayDiv = DOM.elid("flight-messages");
  let section = DOM.section();
  let row = section.appendChild(DOM.div({ className: 'row' }));
  row.appendChild(DOM.div({ className: 'col-sm-1 field' }, label));
  if (error) {
    console.log('displayFlightMessage error: ' + error);
  }
  row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, String(result)));
  section.appendChild(row);
  displayDiv.append(section);
  if (displayDiv.childElementCount > 3) {
    displayDiv.removeChild(displayDiv.firstChild);
  }
}

function displayInsuranceMessage(label, error, result) {

  let displayDiv = DOM.elid("insurance-messages");
  let section = DOM.section();
  let row = section.appendChild(DOM.div({ className: 'row' }));
  row.appendChild(DOM.div({ className: 'col-sm-1 field' }, label));
  if (error) {
    console.log('displayInsuranceMessage error: ' + error);
  }
  row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, String(result)));
  section.appendChild(row);
  displayDiv.append(section);
  if (displayDiv.childElementCount > 3) {
    displayDiv.removeChild(displayDiv.firstChild);
  }
}
