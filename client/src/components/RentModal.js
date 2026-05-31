import React, { useState } from 'react';

export default function RentModal({ gpu, onClose, onSubmit }) {
  const [hours, setHours] = useState(1);

  const totalPrice = (gpu.price_per_hour * hours).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(gpu.id, hours);
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
              <input type="text" value={`¥${gpu.price_per_hour}/小时`} disabled />
            </div>
            <div className="form-group">
              <label>租赁时长（小时）</label>
              <input
                type="number"
                min="1"
                max="720"
                value={hours}
                onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="order-total">
              <span>总计费用</span>
              <span className="total-price">¥{totalPrice}</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">确认下单</button>
          </div>
        </form>
      </div>
    </div>
  );
}
