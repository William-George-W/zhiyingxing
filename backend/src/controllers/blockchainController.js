const blockchain = require('../utils/blockchain');
const { success, fail } = require('../utils/response');

/**
 * GET /api/blockchain/verify/:txHash
 */
const verifyTransaction = async (req, res) => {
  const { txHash } = req.params;
  if (!txHash) return fail(res, '交易哈希不能为空');

  try {
    const detail = await blockchain.getTransactionDetail(txHash);
    if (!detail) return fail(res, '未找到交易记录', 404);
    
    return success(res, detail);
  } catch (err) {
    console.error('[verifyTransaction]', err);
    return fail(res, '验证过程发生错误: ' + err.message, 500);
  }
};

module.exports = {
  verifyTransaction,
};
