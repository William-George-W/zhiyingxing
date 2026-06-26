/**
 * 智引星 - 智能合约部署脚本
 * 用途：将 ResumeEvidence.sol 编译并部署到本地 Geth 节点
 *
 * 使用方法：
 *   1. 确保本地 Geth 节点已启动：
 *      geth --dev --http --http.corsdomain "*" --http.api eth,net,web3,personal
 *   2. 运行：node deployContract.js
 */

require('dotenv').config();
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.GETH_RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.GETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function main() {
  console.log('🚀 开始部署 ResumeEvidence 合约...');
  console.log(`   节点地址: ${RPC_URL}`);

  // 1. 读取 Solidity 源码
  const contractPath = path.join(__dirname, 'contracts', 'ResumeEvidence.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  // 2. 用 solc 编译
  console.log('🔨 正在编译合约...');
  const input = {
    language: 'Solidity',
    sources: {
      'ResumeEvidence.sol': { content: source },
    },
    settings: {
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // 检查编译错误
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ 编译失败:');
      errors.forEach(e => console.error(' ', e.formattedMessage));
      process.exit(1);
    }
    // 仅警告，继续部署
    output.errors.forEach(e => console.warn('  ⚠️', e.formattedMessage));
  }

  const contractOutput = output.contracts['ResumeEvidence.sol']['ResumeEvidence'];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;

  console.log('✅ 编译成功');

  // 3. 连接节点并部署
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`💳 部署账户: ${wallet.address}`);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy({ gasLimit: 3000000 });

  console.log(`📡 交易已广播，合约地址: ${contract.target}`);
  console.log('   等待上链确认...');

  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(`✅ 合约部署成功！地址: ${deployedAddress}`);

  // 4. 将地址和 ABI 写入 deployed.json，供 blockchain.js 自动加载
  const deployedInfo = {
    address: deployedAddress,
    abi: abi,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, 'contracts', 'ResumeEvidence.deployed.json');
  fs.writeFileSync(outputPath, JSON.stringify(deployedInfo, null, 2), 'utf8');
  console.log(`📄 合约信息已保存至: ${outputPath}`);
  console.log('\n🎉 部署完成！现在可以重启后端服务以自动加载新合约。');
}

main().catch(err => {
  console.error('❌ 部署失败:', err.message);
  process.exit(1);
});
