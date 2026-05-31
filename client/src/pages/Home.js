import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1>高性能GPU算力租赁</h1>
        <p>按需租用顶级GPU资源，灵活计费，即开即用</p>
        <Link to="/gpus" className="btn btn-primary btn-lg">浏览GPU资源</Link>
      </section>
      <section className="features">
        <div className="feature">
          <h3>弹性算力</h3>
          <p>按小时计费，随租随用，无需长期绑定</p>
        </div>
        <div className="feature">
          <h3>顶级硬件</h3>
          <p>A100、H100等旗舰GPU，满足大模型训练需求</p>
        </div>
        <div className="feature">
          <h3>稳定可靠</h3>
          <p>7x24小时运维保障，自动故障切换</p>
        </div>
      </section>
    </div>
  );
}
