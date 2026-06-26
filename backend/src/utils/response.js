/**
 * 统一响应工具
 */
const success = (res, data = null, message = 'success', statusCode = 200) => {
  res.status(statusCode).json({
    code: 0,
    message,
    data,
  });
};

const fail = (res, message = '操作失败', statusCode = 400, code = -1) => {
  res.status(statusCode).json({
    code,
    message,
    data: null,
  });
};

const paginate = (res, list, total, page, pageSize) => {
  res.status(200).json({
    code: 0,
    message: 'success',
    data: {
      list,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
};

module.exports = { success, fail, paginate };
