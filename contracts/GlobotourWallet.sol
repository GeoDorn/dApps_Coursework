// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GlobotourWallet {
    address public vendor; // Ganache Account 1 receives all payments

    mapping(address => uint256) public balances;

    struct Booking {
        address user;
        string hotelName;
        string checkInDate;
        string checkOutDate;
        uint256 amount;
        string currency;
        uint256 timestamp;
    }

    Booking[] private bookings;
    mapping(address => uint256[]) private userBookings;

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event BookingCreated(
        uint256 indexed bookingId,
        address indexed user,
        address indexed vendor,
        string hotelName,
        uint256 amount,
        string checkIn,
        string checkOut
    );
    event PaymentSent(
        uint256 indexed bookingId,
        address indexed vendor,
        uint256 amount
    );

    constructor(address _vendor) {
        require(_vendor != address(0), "Vendor address required");
        vendor = _vendor; // Set vendor to Ganache Account 1
    }

    // Deposit funds into the wallet
    function depositFunds() external payable {
        require(msg.value > 0, "Invalid amount");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    // Make a booking and pay the vendor
    function makeBooking(
        string calldata hotelName,
        string calldata checkIn,
        string calldata checkOut,
        uint256 amount,
        string calldata currency
    ) external returns (uint256 bookingId) {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Deduct from user balance
        balances[msg.sender] -= amount;

        bookingId = bookings.length;

        bookings.push(
            Booking({
                user: msg.sender,
                hotelName: hotelName,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                amount: amount,
                currency: currency,
                timestamp: block.timestamp
            })
        );

        userBookings[msg.sender].push(bookingId);

        // Emit event including check-in and check-out
        emit BookingCreated(bookingId, msg.sender, vendor, hotelName, amount, checkIn, checkOut);

        // Send payment to vendor (Ganache Account 1)
        (bool success, ) = vendor.call{value: amount}("");
        require(success, "Payment to vendor failed");

        emit PaymentSent(bookingId, vendor, amount);
    }

    // Check the balance of the caller
    function checkBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    // Get total number of bookings
    function getTotalBookings() external view returns (uint256) {
        return bookings.length;
    }

    // Get a booking by ID
    function getBooking(uint256 id)
        external
        view
        returns (
            address user,
            string memory hotelName,
            string memory checkIn,
            string memory checkOut,
            uint256 amount,
            string memory currency,
            uint256 timestamp
        )
    {
        require(id < bookings.length, "Booking not found");

        Booking memory b = bookings[id];
        return (b.user, b.hotelName, b.checkInDate, b.checkOutDate, b.amount, b.currency, b.timestamp);
    }

    // Get all booking IDs of a user
    function getUserBookings(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userBookings[user];
    }

    // Get the vendor address
    function getVendorAddress() external view returns (address) {
        return vendor;
    }
}