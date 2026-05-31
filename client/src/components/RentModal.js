import React, { useState } from 'react';
import { formatPrice } from '../utils/format';

const MAX_HOURS = 720;

export default function RentModal({ gpu, onClose, onSubmit }) {
  const [hours, setHours] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const totalPriceCents = gpu.price_per_hour * hours;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(gpu.id, hours);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHoursChange = (e) => {
    let v = parseInt(e.target.value) || 1;
    v = Math.max(1, Math.min(MAX_HOURS, v));
    setHours(v);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>租赁 {gpu.name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>GPU型号</label>
              <input type="text" value={gpu.model} disabled />
            </div>
            <div className="form-group">
              <label>单价</label>
              <input type="text" value={`¥${formatPrice(gpu.price_per_hour)}/小时`} disabled />
            </div>
            <div className="form-group">
              <label>租赁时长（小时，最大{MAX_HOURS}）</label>
              <input
                type="number"
                min="1"
                max={MAX_HOURS}
                value={hours}
                onChange={handleHoursChange}
              />
            </div>
            <div className="order-total">
              <span>总计费用</span>
              <span className="total-price">¥{formatPrice(totalPriceCents)}</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '确认下单'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}