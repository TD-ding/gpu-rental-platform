export function formatPrice(cents) {
  return (cents / 100).toFixed(2);
}

export const STATUS_MAP = {
  pending: '待支付',
  paid: '已支付',
  running: '运行中',
  completed: '已完成',
  cancelled: '已取消',
};

export const NEXT_STATUS = {
  pending: ['paid', 'cancelled'],
  paid: ['running', 'cancelled'],
  running: ['completed'],
  completed: [],
  cancelled: [],
};

export const GPU_STATUS_MAP = {
  available: '可用',
  unavailable: '不可用',
};
