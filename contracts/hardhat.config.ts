import 'dotenv/config'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: '0.8.20', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
  },
  networks: {
    hardhat: {},
    polygon: {
      url: process.env.CONTRACT_RPC_URL || 'https://polygon-rpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 137,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 42161,
    },
    base: {
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
}
export default config
