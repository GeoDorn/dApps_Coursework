const GlobotourWallet = artifacts.require("GlobotourWallet");
const { expect, assert } = require("chai");

contract("GlobotourWallet", (accounts) => {
  const [deployer, vendor, user] = accounts;
  let wallet;

  beforeEach(async () => {
    wallet = await GlobotourWallet.new(vendor);
  });

  it("sets the vendor address correctly", async () => {
    const storedVendor = await wallet.getVendorAddress();
    expect(storedVendor).to.equal(vendor);
  });

  it("allows a user to deposit ETH", async () => {
    const depositAmount = web3.utils.toWei("1", "ether");

    const tx = await wallet.depositFunds({
      from: user,
      value: depositAmount
    });

    const balance = await wallet.checkBalance({ from: user });
    expect(balance.toString()).to.equal(depositAmount);

    // Check Deposit event
    expect(tx.logs[0].event).to.equal("Deposit");
    expect(tx.logs[0].args.user).to.equal(user);
  });

  it("creates a booking and sends ETH to vendor", async () => {
    const depositAmount = web3.utils.toWei("2", "ether");
    const bookingAmount = web3.utils.toWei("1", "ether");

    // User deposits ETH
    await wallet.depositFunds({
      from: user,
      value: depositAmount
    });

    const vendorBalanceBefore = BigInt(
      await web3.eth.getBalance(vendor)
    );

    const tx = await wallet.makeBooking(
      "Hotel Blockchain",
      "2025-01-01",
      "2025-01-05",
      bookingAmount,
      "ETH",
      { from: user }
    );

    const vendorBalanceAfter = BigInt(
      await web3.eth.getBalance(vendor)
    );

    // Vendor receives ETH
    expect(vendorBalanceAfter - vendorBalanceBefore).to.equal(
      BigInt(bookingAmount)
    );

    // User balance reduced
    const userBalance = await wallet.checkBalance({ from: user });
    expect(userBalance.toString()).to.equal(
      web3.utils.toWei("1", "ether")
    );

    // Check events
    expect(tx.logs[0].event).to.equal("BookingCreated");
    expect(tx.logs[1].event).to.equal("PaymentSent");
  });

  it("prevents booking with insufficient balance", async () => {
    const bookingAmount = web3.utils.toWei("1", "ether");

    try {
      await wallet.makeBooking(
        "Expensive Hotel",
        "2025-01-01",
        "2025-01-05",
        bookingAmount,
        "ETH",
        { from: user }
      );
      assert.fail("Transaction should have reverted");
    } catch (error) {
      assert(
        error.message.includes("Insufficient balance"),
        "Expected Insufficient balance revert"
      );
    }
  });
});
