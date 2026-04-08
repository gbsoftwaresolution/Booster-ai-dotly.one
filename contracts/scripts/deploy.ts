import { ethers, network } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Deploy DotlySubscription contract.
 * Set USDC_ADDRESS env var for the target network.
 * Default USDC address is the Polygon Amoy testnet address.
 */
async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying with account:', deployer.address)

  // USDC addresses per network
  const USDC_ADDRESSES: Record<string, string> = {
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon mainnet USDC
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base mainnet USDC
    polygon_amoy: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Amoy testnet USDC (replaces deprecated Mumbai)
    hardhat: process.env.USDC_ADDRESS || '0x0000000000000000000000000000000000000001', // placeholder
  }

  const usdcAddress = process.env.USDC_ADDRESS || USDC_ADDRESSES[network.name] || USDC_ADDRESSES['hardhat']
  console.log(`Network: ${network.name}`)
  console.log(`USDC address: ${usdcAddress}`)

  const DotlySubscription = await ethers.getContractFactory('DotlySubscription')
  const contract = await DotlySubscription.deploy(usdcAddress)
  await contract.waitForDeployment()

  const contractAddress = await contract.getAddress()
  console.log('DotlySubscription deployed to:', contractAddress)

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress,
    usdcAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  }

  const deploymentsDir = path.join(__dirname, '..', 'deployments')
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true })
  }

  const filePath = path.join(deploymentsDir, `${network.name}.json`)
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2))
  console.log(`Deployment info saved to ${filePath}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
