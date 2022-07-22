pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
//import "./FlightSuretyApp.sol";
import "./FSA.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       CONSTANTES                                     */
    /********************************************************************************************/
    uint256 public constant PAYOUT_FACTOR = 1.5;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    mapping(address => bool) airlines;
    mapping(address => bool) allowed;
    uint256 airlines_count = 0;
    mapping(address => address[]) votes;

    struct Subscription {
        uint256 value;
        bool refund;
        bool used;
    }
    mapping(address => mapping(bytes32 => Subscription)) subscriptions;

    FlightSuretyApp app;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
        nextId = 1;
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
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireSubClean(bytes32 key) {
        require(subscriptions[msg.sender][key], "No subscription taken");
        Subscription storage sub = subscriptions[msg.sender][key];
        require(sub.refund == false, "Subscription already refunded");
        require(sub.used == false, "Subscription already used");
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
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function setAppContract(address addr) external requireContractOwner {
        app = FlightSuretyApp(addr);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(string name)
        external
        pure
        requireContractOwner
        returns (uint256)
    {
        airlines[nextId] = name;
        return nextId++;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address airline,
        string flight,
        uint256 timestamp
    ) external payable {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(
            !subscriptions[msg.sender][key],
            "You have already took a insurance for this flight"
        );
        require(timestamp > now, "the fly is past");
        require(app.flights[key], "this flight does not exist");
        uint256 value = msg.value;
        if (msg.value > 1 ether) {
            uint256 refund = msg.value.sub(1 ether);
            value = 1 ether;
            msg.sender.transfer(refund);
        }
        subscriptions[msg.sender][key] = Subscription(value, false, false);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(
        address airline,
        string memory flight,
        uint256 timestamp
    ) external requireSubClean(getFlightKey(airline, flight, timestamp)) {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        subscriptions[msg.sender][key].refund = true;
        msg.sender.transfer(subscriptions[msg.sender][key].value);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(
        address airline,
        string memory flight,
        uint256 timestamp
    ) external requireSubClean(getFlightKey(airline, flight, timestamp)) {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(app.flights[key].statusCode == app.STATUS_CODE_LATE_AIRLINE);
        subscriptions[msg.sender][key].used = true;
        msg.sender.transfer(
            subscriptions[msg.sender][key].value.multiply(PAYOUT_FACTOR)
        );
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {
        require(msg.value == 10 ether, "you have to send 10 ether");
        allowed[msg.sender] = true;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund();
    }
}
