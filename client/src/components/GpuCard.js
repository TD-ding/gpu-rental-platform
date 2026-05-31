import React from 'react';
import { formatPrice, GPU_STATUS_MAP } from '../utils/format';

export default function GpuCard({ gpu, onRent }) {
  return (
    <div className="gpu-card">
      <div className="gpu-card-header">
        <h3>{gpu.name}</h3>
        <span className={`gpu-status ${gpu.status}`}>{GPU_STATUS_MAP[gpu.status] || gpu.status}</span>
      </div>
      <div className="gpu-card-body">
        <div className="gpu-spec">
          <span className="spec-label">型号</span>
          <span className="spec-value">{gpu.model}</span>
        </div>
        <div className="gpu-spec">
          <span className="spec-label">显存</span>
          <span className="spec-value">{gpu.vram}</span>
        </div>
        <div className="gpu-spec">
          <span className="spec-label">算力</span>
          <span className="spec-value">{gpu.compute_power}</span>
        </div>
        <div className="gpu-spec">
          <span className="spec-label">可用/总量</span>
          <span className="spec-value">{gpu.available_units}/{gpu.total_units}</span>
        </div>
        {gpu.description && <p className="gpu-desc">{gpu.description}</p>}
      </div>
      <div className="gpu-card-footer">
        <div className="gpu-price">
          <span className="price-amount">¥{formatPrice(gpu.price_per_hour)}</span>
          <span className="price-unit">/小时</span>
        </div>
        <button
          className="btn btn-primary"
          disabled={gpu.available_units <= 0 || gpu.status !== 'available'}
          onClick={() => onRent(gpu)}
        >
          {gpu.available_units > 0 ? '立即租赁' : '暂无库存'}
        </button>
      </div>
    </div>
  );
}
