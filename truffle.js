const HDWalletProvider = require('@truffle/hdwallet-provider');
const mnemonic = 'parrot crew drama alpha coach organ chalk scale electric inside pepper quiz';

module.exports = {
  networks: {
    development: {
      provider: () => new HDWalletProvider(mnemonic, 'http://127.0.0.1:7545/', 0, 50),
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: '^0.4.25'
    }
  }
};