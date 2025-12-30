const GlobotourWallet = artifacts.require("GlobotourWallet");

module.exports = function (deployer, network, accounts) {
  // accounts[1] is the vendor (hotel) - Ganache Account 1
  const vendorAddress = accounts[1];
  
  console.log("Deploying GlobotourWallet contract...");
  console.log("Deployer:", accounts[0]); // This account deploys the contract
  console.log("Vendor (receives payments):", vendorAddress);
  
  deployer.deploy(GlobotourWallet, vendorAddress);
};