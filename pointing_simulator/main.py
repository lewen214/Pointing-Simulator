"""
卫星激光通信位置指向算法仿真平台
用法:
    python main.py                              # 默认配置，lead_ahead 算法
    python main.py --config config/scenario_LEO.yaml
    python main.py --algo naive                 # 对比朴素算法
    python main.py --monte-carlo 50             # 蒙特卡洛实验 50 次
    python main.py --compare                    # 四种算法对比
"""

import argparse
import os
import sys
import numpy as np
import pandas as pd

# 确保项目根目录在 PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulator.engine import SimulationEngine
from utils.metrics import compute_metrics, print_report
from utils.visualization import plot_results, plot_orbit_3d
from core.orbit import Satellite


os.makedirs('results', exist_ok=True)


# ── 单次仿真 ────────────────────────────────────────────────────────────────

def run_single(config_path, algorithm='lead_ahead', tag=''):
    engine = SimulationEngine(config_path, algorithm=algorithm)
    df = engine.run()
    label = f"{algorithm}{('_' + tag) if tag else ''}"
    df.to_csv(f'results/sim_{label}.csv', index=False)
    metrics = compute_metrics(df)
    print_report(metrics)
    plot_results(df, save_path=f'results/plots_{label}.png')
    return df, metrics


# ── 蒙特卡洛 ────────────────────────────────────────────────────────────────

def run_monte_carlo(config_path, N=100, algorithm='lead_ahead'):
    print(f"\n=== Monte Carlo: N={N}, algorithm={algorithm} ===")
    import yaml
    with open(config_path, 'r', encoding='utf-8') as f:
        base_config = yaml.safe_load(f)

    results = []
    for i in range(N):
        # 随机化初始相位
        import copy, tempfile
        cfg = copy.deepcopy(base_config)
        rng = np.random.default_rng(i)
        cfg['satellites']['sat_A']['initial_phase'] = float(rng.uniform(0, 360))
        cfg['satellites']['sat_B']['initial_phase'] = float(rng.uniform(0, 360))
        cfg['simulation']['random_seed'] = int(i)

        # 写临时配置
        import yaml as _yaml
        with tempfile.NamedTemporaryFile('w', suffix='.yaml', delete=False,
                                         encoding='utf-8') as tf:
            _yaml.dump(cfg, tf)
            tmp_path = tf.name

        try:
            engine = SimulationEngine(tmp_path, algorithm=algorithm)
            df = engine.run()
            m = compute_metrics(df)
            m['run'] = i
            results.append(m)
            trk = m.get('first_track_time_s')
            rms = m.get('tracking_rms_urad')
            trk_str = f"{trk:.2f}" if isinstance(trk, float) else str(trk)
            rms_str = f"{rms:.2f}" if isinstance(rms, float) else str(rms)
            print(f"  Run {i+1:3d}/{N}: track={trk_str}s  rms={rms_str} urad")
        except Exception as e:
            print(f"  Run {i+1}: ERROR — {e}")
        finally:
            os.unlink(tmp_path)

    df_mc = pd.DataFrame(results)
    df_mc.to_csv('results/monte_carlo.csv', index=False)
    print("\n── 蒙特卡洛统计 ──")
    for col in ['first_track_time_s', 'tracking_rms_urad', 'availability_pct']:
        if col in df_mc.columns:
            v = df_mc[col].dropna()
            print(f"  {col}: mean={v.mean():.3f}  std={v.std():.3f}  "
                  f"min={v.min():.3f}  max={v.max():.3f}")
    print(f"  成功率: {len(df_mc[df_mc['first_track_time_s'].notna()])/N*100:.1f}%")


# ── 算法对比 ────────────────────────────────────────────────────────────────

def run_compare(config_path):
    algos = ['naive', 'light_time', 'lead_ahead', 'predictive']
    summary = []
    for algo in algos:
        print(f"\n── Algorithm: {algo} ──")
        _, m = run_single(config_path, algorithm=algo, tag='cmp')
        m['algorithm'] = algo
        summary.append(m)
    df_cmp = pd.DataFrame(summary)
    df_cmp.to_csv('results/algorithm_comparison.csv', index=False)
    print("\n── 算法对比汇总 ──")
    cols = ['algorithm', 'first_track_time_s', 'tracking_rms_urad', 'availability_pct']
    print(df_cmp[[c for c in cols if c in df_cmp.columns]].to_string(index=False))


# ── 入口 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='卫星激光通信位置指向仿真平台')
    parser.add_argument('--config', default='config/default_config.yaml')
    parser.add_argument('--algo', default='lead_ahead',
                        choices=['naive', 'light_time', 'lead_ahead', 'predictive'])
    parser.add_argument('--monte-carlo', type=int, default=0, metavar='N',
                        help='运行 N 次蒙特卡洛实验')
    parser.add_argument('--compare', action='store_true',
                        help='对比四种指向算法')
    parser.add_argument('--orbit-plot', action='store_true',
                        help='绘制三维轨道图')
    args = parser.parse_args()

    if args.orbit_plot:
        import yaml
        with open(args.config, 'r', encoding='utf-8') as f:
            cfg = yaml.safe_load(f)
        def _sat(name, c):
            return Satellite(name, altitude=c['altitude'],
                             inclination_deg=c['inclination'],
                             raan_deg=c.get('raan', 0.0),
                             initial_phase_deg=c.get('initial_phase', 0.0))
        sat_A = _sat('A', cfg['satellites']['sat_A'])
        sat_B = _sat('B', cfg['satellites']['sat_B'])
        plot_orbit_3d(sat_A, sat_B, save_path='results/orbit_3d.png')

    if args.monte_carlo > 0:
        run_monte_carlo(args.config, N=args.monte_carlo, algorithm=args.algo)
    elif args.compare:
        run_compare(args.config)
    else:
        run_single(args.config, algorithm=args.algo)


if __name__ == '__main__':
    main()
