pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;      // Account used to deploy contract
    bool private operational = true;    // Blocks all state changes throughout the contract if false

    mapping(address => uint256) private authorizedContracts;

    // airlines info
    struct Airline {
        string name;
        bool isRegistered;
        uint256 funded;
        uint256 votes;
        bool exists;
    }

    mapping(address => Airline) airlines;      // Mapping for storing airlines

    // flights info
    struct Flight {
        bool isRegistered;
        string flightCode;
        uint256 timestamp;
        address airline;
    }

    mapping(bytes32 => Flight) private flights;

    // passengers info
    struct Passenger {
        address wallet;
        mapping(bytes32 => uint256) boughtFlight;
        uint256 credit;
    }

    mapping(address => Passenger) private passengers;
    address[] public passengerAddresses;
    // store a mapping of passenger addresses and their credit balances
    mapping(address => uint256) private creditBalances;

    uint256 public constant MINIMUM_FUNDS = 10 ether;
    uint256 public constant INSURANCE_PRICE_LIMIT = 1 ether;

    uint256 public airlinesCount;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(string airlineName) public
    {
        contractOwner = msg.sender;
        airlinesCount = 0;
        authorizedContracts[msg.sender] = 1;
        passengerAddresses = new address[](0);

        // First airline is registered when contract is deployed.
        airlines[msg.sender] = Airline({
        name : airlineName,
        isRegistered : true,
        funded : 0,
        votes : 0,
        exists : true
        });
        airlinesCount++;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational() public view returns (bool)
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external
    requireIsCallerAuthorized
    {
        require(mode != operational, "Operating status mode must be different from current one");

        operational = mode;
    }

    function authorizeCaller(address callerAddress) external
    requireIsOperational
    requireContractOwner
    {
        authorizedContracts[callerAddress] = 1;
    }

    function deauthorizeCaller(address callerAddress) external
    requireIsOperational
    requireContractOwner
    {
        delete authorizedContracts[callerAddress];
    }

    function isAirlineRegistered(address airline) external
    requireIsOperational
    returns (bool)
    {
        return airlines[airline].isRegistered;
    }

    function passengerAlreadyExists(address passenger) internal view returns (bool found)
    {
        found = false;
        for (uint256 i = 0; i < passengerAddresses.length; i++) {
            if (passengerAddresses[i] == passenger) {
                found = true;
                break;
            }
        }
        return found;
    }

    function isPassengerInsured(bytes32 flightKey, address passenger) public view returns (bool)
    {
        return passengers[passenger].boughtFlight[flightKey] > 0;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isAirlineFunded(address airline) public view
    requireIsOperational
    returns (bool) {
        return (airlines[airline].funded >= MINIMUM_FUNDS);
    }

    /**
     * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address newAirlineAddress, string name, bool registered, uint funded) external
    requireIsOperational
    requireIsCallerAuthorized
    {
        require(newAirlineAddress != address(0), "Airline address must be a valid address.");
        require(!airlines[newAirlineAddress].exists, "Airline already exists.");

        airlines[newAirlineAddress] = Airline({
        name : name,
        isRegistered : registered,
        funded : funded,
        votes : 0,
        exists : true
        });

        if (registered) {
            airlinesCount++;
        }
    }

    function voteForAirline(address newAirline, uint threshold) public
    requireIsOperational
    {
        airlines[newAirline].votes++;

        if (airlines[newAirline].votes >= threshold) {
            airlines[newAirline].isRegistered = true;
            airlinesCount++;
        }
    }

    function airlineExists(address airline) external view returns (bool) {
        return airlines[airline].exists;
    }

    function registerFlight(bytes32 key, string code, uint256 timestamp) external
    requireIsOperational
    requireIsCallerAuthorized
    {
        require(!flights[key].isRegistered, "Flight is already registered.");

        flights[key] = Flight({
        isRegistered : true,
        flightCode : code,
        timestamp : timestamp,
        airline : msg.sender
        });
    }

    function isFlightRegistered(bytes32 key) public view
    requireIsOperational
    requireIsCallerAuthorized
    returns (bool)
    {
        return flights[key].isRegistered;
    }

    /**
     * @dev Buy insurance for a flight
    *
    */
    function buy(bytes32 flightKey, address passenger, uint price) external payable
    requireIsOperational
    requireIsCallerAuthorized
    {
        require(price > 0, "Flight insurance price needs to be > 0");
        require(isFlightRegistered(flightKey), "Flight does not exist, or is not registered");
        require(!isPassengerInsured(flightKey, passenger), "Passenger can't buy insurance for the same flight twice");

        if (passengerAlreadyExists(passenger)) {
            passengers[passenger].boughtFlight[flightKey] = price;
        } else {
            passengerAddresses.push(passenger);

            passengers[passenger] = Passenger({
            wallet : passenger,
            credit : 0
            });
            passengers[passenger].boughtFlight[flightKey] = price;
        }

        if (price > INSURANCE_PRICE_LIMIT) {
            passenger.transfer(price.sub(INSURANCE_PRICE_LIMIT));
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 flightKey, uint multiplier, address passenger) external
    requireIsOperational
    requireIsCallerAuthorized
    {
        require(!isPassengerInsured(flightKey, passenger), "Passenger is not insured for this flight");
        uint256 credit = multiplier.mul(passengers[passenger].boughtFlight[flightKey]);
        passengers[passenger].boughtFlight[flightKey] = 0;
        creditBalances[passenger].add(credit);
    }

    function getPassengerCreditBalance(address passenger) public view
    requireIsOperational
    requireIsCallerAuthorized
    returns (uint256 balance)
    {
        return creditBalances[passenger];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address passenger) external payable
    requireIsOperational
    requireIsCallerAuthorized
    {
        // checks
        require(creditBalances[passenger] > 0, "Passenger has no credit balance");
        // effects
        uint256 money = creditBalances[passenger];
        creditBalances[passenger] = 0;
        // interaction
        passenger.transfer(money);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund(address airline) public payable
    requireIsOperational
    {
        uint256 currentFunds = airlines[airline].funded;
        airlines[airline].funded = currentFunds.add(msg.value);
    }

    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)

    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
        fund(msg.sender);
    }
}

