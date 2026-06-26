const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 本地 geth 节点的 RPC 地址
const RPC_URL = process.env.GETH_RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.GETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// ── 自动从 deployed.json 加载合约地址和 ABI ──
const deployedFilePath = path.join(__dirname, '../../contracts/ResumeEvidence.deployed.json');
let CONTRACT_ADDRESS = null;
let resumeEvidenceABI = null;

if (fs.existsSync(deployedFilePath)) {
  try {
    const deployedInfo = JSON.parse(fs.readFileSync(deployedFilePath, 'utf8'));
    CONTRACT_ADDRESS = deployedInfo.address;
    resumeEvidenceABI = deployedInfo.abi;
    console.log(`[Blockchain] ✅ 已自动加载合约: ${CONTRACT_ADDRESS} (部署于 ${deployedInfo.deployedAt})`);
  } catch (e) {
    console.error('[Blockchain] ⚠️ 读取 deployed.json 失败:', e.message);
  }
} else {
  // 未部署合约时的降级 ABI（仅用于 fallback 模式）
  resumeEvidenceABI = [
    "function recordApplication(uint256 _applicationId, string _studentId, string _jobId, string _extraData) public",
    "event ApplicationRecorded(uint256 indexed applicationId, string studentId, string jobId, string extraData, uint256 timestamp)"
  ];
  console.warn('[Blockchain] ⚠️ 未找到已部署的合约文件，将使用裸交易降级模式。运行 node deployContract.js 来部署合约。');
}

let provider;
let wallet;

try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`[Blockchain] 连接节点: ${RPC_URL}, 账户: ${wallet.address}`);
} catch (e) {
  console.error('[Blockchain] 初始化失败:', e.message);
}

/**
 * 将投递记录存证到链上
 * @param {Number} applicationId 投递ID
 * @param {Number} studentId 学生ID
 * @param {Number} jobId 岗位ID
 * @param {String} extraData 其他附加信息
 * @returns {Promise<String>} 存证成功返回上链的 Transaction Hash
 */
async function sendApplicationEvidence(applicationId, studentId, jobId, extraData = "") {
  if (!wallet) {
    throw new Error('区块链钱包未成功初始化，请检查 Geth 节点和私钥配置。');
  }

  // 未部署合约时降级为裸数据交易模式：携带编码后的 JSON payload 发送自转账交易
  if (!CONTRACT_ADDRESS) {
    console.warn('[Blockchain] 降级模式：发送裸数据交易（无合约）');
    const payloadString = JSON.stringify({ event: 'Apply', applicationId, studentId, jobId, extraData });
    const payloadHex = ethers.hexlify(ethers.toUtf8Bytes(payloadString));
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      data: payloadHex,
    });
    console.log(`[Blockchain] 🔗 裸交易已发送: ${tx.hash}`);
    return tx.hash;
  }

  // 调用已部署的智能合约
  const contract = new ethers.Contract(CONTRACT_ADDRESS, resumeEvidenceABI, wallet);
  try {
    const tx = await contract.recordApplication(
      applicationId,
      String(studentId),
      String(jobId),
      String(extraData),
      { gasLimit: 500000 } // 强制设置 gasLimit，确保在本地 Geth 环境下顺利进入 mempool
    );
    console.log(`[Blockchain] 🔗 合约交易已发送: ${tx.hash}，正在等待上链确认...`);
    
    // ── 优化：引入超时竞争机制，防止本地节点掉线或轮询失败导致请求挂死 ──
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 15000); // 15秒超时
    });

    try {
      await Promise.race([tx.wait(1), timeoutPromise]);
      console.log(`[Blockchain] ✅ 交易已确认: ${tx.hash}`);
    } catch (waitError) {
      if (waitError.message === 'TIMEOUT_EXCEEDED') {
        console.warn(`[Blockchain] ⚠️ 确认超时（15s），但交易已广播。Hash: ${tx.hash}`);
      } else {
        throw waitError;
      }
    }

    return tx.hash;
  } catch (error) {
    console.error(`[Blockchain] 交易发送失败 (appId=${applicationId}):`, error.message);
    throw error;
  }
}

/**
 * 根据交易哈希查询链上详情并解析数据
 * @param {String} txHash 交易哈希
 */
async function getTransactionDetail(txHash) {
  if (!provider) throw new Error('区块链节点未连接');
  
  const tx = await provider.getTransaction(txHash);
  if (!tx) return null;

  let decodedData = null;
  // 如果是合约调用，尝试解析参数
  if (CONTRACT_ADDRESS && tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    const iface = new ethers.Interface(resumeEvidenceABI);
    try {
      const decoded = iface.parseTransaction({ data: tx.data });
      if (decoded) {
        decodedData = {
          function: decoded.name,
          args: {
            applicationId: decoded.args[0].toString(),
            studentId: decoded.args[1],
            jobId: decoded.args[2],
            extraData: decoded.args[3]
          }
        };
      }
    } catch (e) {
      console.warn('[Blockchain] 解析合约数据失败:', e.message);
    }
  }

  // 如果解析失败或者是降级裸交易，尝试直接 UTF-8 解码 data
  if (!decodedData && tx.data && tx.data !== '0x') {
    try {
      const utf8Body = ethers.toUtf8String(tx.data);
      decodedData = { raw: utf8Body };
    } catch (e) {
      decodedData = { hex: tx.data };
    }
  }

  const receipt = await provider.getTransactionReceipt(txHash);

  return {
    blockNumber: tx.blockNumber,
    from: tx.from,
    to: tx.to,
    confirmations: tx.confirmations,
    status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
    decodedData
  };
}

module.exports = {
  provider,
  wallet,
  sendApplicationEvidence,
  getTransactionDetail,
};
