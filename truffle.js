const HDWalletProvider = require('@truffle/hdwallet-provider');
const mnemonic = 'basket sell cliff ivory cover acid loan parrot vanish soup pass south';

module.exports = {
  networks: {
    development: {
      // provider: () => new HDWalletProvider(mnemonic, 'http://127.0.0.1:7545/', 0, 50),
      host: "127.0.0.1",     // Localhost (default: none)
      port: 9545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },
  },
  compilers: {
    solc: {
      version: '^0.4.25',
    },
  },
};