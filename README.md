# Pointing Simulator — 卫星激光通信指向仿真平台

A physics-based simulation platform for satellite-to-satellite **laser communication pointing, acquisition, and tracking (PAT)**.  
Implements and benchmarks four pointing algorithms with Monte Carlo analysis and an interactive web dashboard.

---

## Features

- **4 Pointing Algorithms**
  - `naive` — direct pointing, ignores light travel time
  - `light_time` — iterative light-time correction
  - `lead_ahead` — point-ahead (anticipates target future position, ~20–50 μrad lead angle)
  - `predictive` — lead-ahead with stale ephemeris extrapolation
- **Full PAT State Machine**: spiral-scan acquisition → fine tracking, microwave-assisted initial beam alignment
- **Error Modeling**: ephemeris position/velocity noise, attitude jitter & static bias, clock offset
- **Monte Carlo**: randomized orbital phases, statistical RMS / availability / acquisition time over N runs
- **Web Dashboard** (`app.py`): real-time on-demand simulation, algorithm comparison charts, 3D orbit animation
- **YAML-configurable**: LEO scenarios, laser terminal params, PAT thresholds, error budgets

---

## Project Structure

```
pointing_simulator/
├── core/
│   ├── orbit.py          # Satellite orbital mechanics (circular orbit)
│   ├── coordinate.py     # ECI / local frame transforms
│   ├── pointing.py       # 4 pointing algorithm implementations
│   ├── error_model.py    # Ephemeris, attitude, timing error injection
│   └── pat_controller.py # PAT state machine (ACQUIRE / TRACK / LOST)
├── simulator/
│   ├── engine.py         # Main simulation loop
│   ├── scenario.py       # Scenario loader
│   └── recorder.py       # Time-series data recorder
├── utils/
│   ├── math_utils.py     # Vector helpers
│   ├── metrics.py        # RMS, availability, acquisition time
│   └── visualization.py  # Matplotlib plots
├── config/
│   ├── default_config.yaml
│   └── scenario_LEO.yaml # 550 km LEO, 53° inclination
├── tests/
│   └── test_pointing.py
├── app.py                # Flask web dashboard
├── main.py               # CLI entry point
└── requirements.txt
```

---

## Quick Start

```bash
pip install -r requirements.txt

# Single run with default lead-ahead algorithm
python main.py

# Specify algorithm
python main.py --algo naive
python main.py --algo light_time
python main.py --algo predictive

# Compare all 4 algorithms
python main.py --compare

# Monte Carlo (50 runs)
python main.py --monte-carlo 50

# 3D orbit plot
python main.py --orbit-plot

# Web dashboard
python app.py
# then open http://127.0.0.1:5000
```

---

## Algorithm Overview

| Algorithm | Key Idea | Typical Error |
|-----------|----------|--------------|
| Naive | Point at current target position | High (ignores ~5 ms light delay) |
| Light-Time | Iterate to find past target position | Medium |
| Lead-Ahead | Point at predicted future position | Low (~20–50 μrad residual) |
| Predictive | Lead-ahead + stale ephemeris correction | Lowest |

The **lead-ahead (point-ahead) angle** arises because light takes ~5 ms to travel ~1500 km between LEO satellites. At orbital velocity (~7.5 km/s), the target moves ~37 m during that time, requiring a ~25 μrad angular correction.

---

## Configuration

Key parameters in `config/default_config.yaml` / `scenario_LEO.yaml`:

```yaml
satellites:
  sat_A:
    altitude: 550000.0   # m (550 km LEO)
    inclination: 53.0    # degrees

laser_terminal:
  beam_divergence: 0.00002   # rad (20 μrad)
  max_pointing_range: 5.0    # degrees

error_model:
  ephemeris:
    position_std: 100.0    # m
  attitude:
    jitter_amplitude: 0.000003  # rad

microwave:
  freq_Hz: 26e9   # Ka-band assist
```

---

## Results

After `python main.py --compare`, results are saved to `results/`:

- `algorithm_comparison.csv` — RMS error, acquisition time, availability per algorithm
- `plots_<algo>.png` — pointing error time series
- `monte_carlo.csv` — statistical distribution across runs

---

## Requirements

- Python ≥ 3.9
- numpy, scipy, pandas, matplotlib, pyyaml, flask, pytest

---

## License

MIT
