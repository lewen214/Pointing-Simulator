import os, sys, yaml, tempfile, warnings
import numpy as np
import pandas as pd
from flask import Flask, render_template, jsonify, request

warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

# ── helpers ────────────────────────────────────────────────────────────────

def _load_csv(path):
    if os.path.exists(path):
        return pd.read_csv(path)
    return None

def _sample(df, n=800):
    """Downsample to at most n rows."""
    step = max(1, len(df) // n)
    return df.iloc[::step]

# ── routes ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/sim_data')
def sim_data():
    algo = request.args.get('algo', 'lead_ahead')
    path = f'results/sim_{algo}.csv'
    df = _load_csv(path)
    if df is None:
        return jsonify({'error': f'No data for algo={algo}'}), 404
    d = _sample(df)
    return jsonify({
        't':           d['t'].tolist(),
        'total_error': (d['total_error'] * 1e6).tolist(),   # μrad
        'az_error':    (d['az_error']    * 1e6).tolist(),
        'el_error':    (d['el_error']    * 1e6).tolist(),
        'pat_state':   d['pat_state'].tolist(),
        'distance':    (d['distance']    / 1e3).tolist(),   # km
        'lead_angle':  (d['lead_angle']  * 1e6).tolist(),
        'light_time':  (d['light_time']  * 1e3).tolist(),
    })


@app.route('/api/monte_carlo')
def monte_carlo():
    df = _load_csv('results/monte_carlo.csv')
    if df is None:
        return jsonify({'error': 'Run --monte-carlo first'}), 404
    return jsonify({
        'rms':          df['tracking_rms_urad'].tolist(),
        'availability': df['availability_pct'].tolist(),
        'track_time':   df['first_track_time_s'].tolist(),
        'runs':         len(df),
        'success_pct':  float(df['first_track_time_s'].notna().sum() / len(df) * 100),
        'rms_mean':     float(df['tracking_rms_urad'].mean()),
        'rms_std':      float(df['tracking_rms_urad'].std()),
    })


@app.route('/api/compare')
def compare():
    df = _load_csv('results/algorithm_comparison.csv')
    if df is None:
        return jsonify({'error': 'Run --compare first'}), 404
    return jsonify({
        'algorithms':  df['algorithm'].tolist(),
        'rms':         df['tracking_rms_urad'].tolist(),
        'track_time':  df['first_track_time_s'].tolist(),
        'avail':       df['availability_pct'].tolist(),
    })


@app.route('/api/run', methods=['POST'])
def run_simulation():
    """Run a quick on-demand simulation and return live results."""
    params = request.json or {}
    algorithm = params.get('algorithm', 'lead_ahead')
    duration  = float(params.get('duration', 60.0))

    with open('config/default_config.yaml', encoding='utf-8') as f:
        cfg = yaml.safe_load(f)
    cfg['simulation']['duration'] = duration
    cfg['simulation']['dt']       = 0.1
    cfg['simulation']['random_seed'] = int(np.random.randint(0, 9999))

    with tempfile.NamedTemporaryFile('w', suffix='.yaml', delete=False, encoding='utf-8') as tf:
        yaml.dump(cfg, tf, allow_unicode=True)
        tmp = tf.name

    try:
        from simulator.engine import SimulationEngine
        from utils.metrics import compute_metrics
        engine = SimulationEngine(tmp, algorithm=algorithm)
        df = engine.run()
        metrics = compute_metrics(df)
        d = _sample(df)
        return jsonify({
            'metrics': {k: (round(v, 4) if isinstance(v, float) else v)
                        for k, v in metrics.items()},
            't':           d['t'].tolist(),
            'total_error': (d['total_error'] * 1e6).tolist(),
            'az_error':    (d['az_error']    * 1e6).tolist(),
            'el_error':    (d['el_error']    * 1e6).tolist(),
            'pat_state':   d['pat_state'].tolist(),
            'distance':    (d['distance']    / 1e3).tolist(),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.unlink(tmp)


@app.route('/api/orbit_positions')
def orbit_positions():
    """Return satellite positions for animation (one full orbit, 360 points)."""
    from core.orbit import Satellite
    with open('config/default_config.yaml', encoding='utf-8') as f:
        cfg = yaml.safe_load(f)

    def _build(key):
        c = cfg['satellites'][key]
        return Satellite(key, altitude=c['altitude'], inclination_deg=c['inclination'],
                         raan_deg=c.get('raan', 0), initial_phase_deg=c.get('initial_phase', 0))

    sat_A = _build('sat_A')
    sat_B = _build('sat_B')

    # Sample positions over one full orbit
    times = np.linspace(0, sat_A.period, 360)
    posA  = [sat_A.get_state(float(t))[0].tolist() for t in times]
    posB  = [sat_B.get_state(float(t))[0].tolist() for t in times]
    period = float(sat_A.period)
    return jsonify({'posA': posA, 'posB': posB, 'period': period,
                    'omega': float(sat_A.omega)})


if __name__ == '__main__':
    print('\n  ★  Pointing Simulator Web  —  http://127.0.0.1:5000\n')
    app.run(debug=False, port=5000)
