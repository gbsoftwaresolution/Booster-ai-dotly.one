import { ethers, network } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const [deployer] = await ethers.getSigners()

  const usdtAddress = process.env.USDT_ADDRESS
  const treasury = process.env.DOTLY_TREASURY_ADDRESS
  const paymentSigner = process.env.DOTLY_PAYMENT_SIGNER_ADDRESS
  const owner = process.env.DOTLY_OWNER_ADDRESS || deployer.address

  if (!usdtAddress) throw new Error('USDT_ADDRESS is required')
  if (!treasury) throw new Error('DOTLY_TREASURY_ADDRESS is required')
  if (!paymentSigner) throw new Error('DOTLY_PAYMENT_SIGNER_ADDRESS is required')

  console.log('Deploying DotlyPaymentVault with account:', deployer.address)
  console.log('Network:', network.name)
  console.log('Owner:', owner)
  console.log('Treasury:', treasury)
  console.log('Payment signer:', paymentSigner)
  console.log('USDT:', usdtAddress)

  const DotlyPaymentVault = await ethers.getContractFactory('DotlyPaymentVault')
  const contract = await DotlyPaymentVault.deploy(owner, treasury, paymentSigner, usdtAddress)
  await contract.waitForDeployment()

  const contractAddress = await contract.getAddress()
  console.log('DotlyPaymentVault deployed to:', contractAddress)

  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress,
    owner,
    treasury,
    paymentSigner,
    usdtAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  }

  const deploymentsDir = path.join(__dirname, '..', 'deployments')
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true })
  }

  const filePath = path.join(deploymentsDir, `payment-vault-${network.name}.json`)
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2))
  console.log(`Deployment info saved to ${filePath}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
