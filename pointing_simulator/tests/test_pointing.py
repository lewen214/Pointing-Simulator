import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pytest
from core.pointing import PointingAlgorithm, C_LIGHT
from utils.math_utils import normalize, angle_between, euler_to_dcm, vector_to_azel


# ── math_utils ─────────────────────────────────────────────────────────────

def test_normalize_unit():
    v = np.array([3.0, 4.0, 0.0])
    assert abs(np.linalg.norm(normalize(v)) - 1.0) < 1e-12

def test_normalize_zero():
    v = np.zeros(3)
    assert np.allclose(normalize(v), np.zeros(3))

def test_angle_between_orthogonal():
    v1 = np.array([1.0, 0, 0])
    v2 = np.array([0, 1.0, 0])
    assert abs(angle_between(v1, v2) - np.pi / 2) < 1e-10

def test_angle_between_parallel():
    v = np.array([1.0, 2.0, 3.0])
    assert angle_between(v, v) < 1e-10

def test_euler_to_dcm_identity():
    dcm = euler_to_dcm(0, 0, 0)
    assert np.allclose(dcm, np.eye(3))

def test_vector_to_azel_roundtrip():
    from utils.math_utils import azel_to_vector
    az, el = 0.5, 0.3
    v = azel_to_vector(az, el)
    az2, el2 = vector_to_azel(v)
    assert abs(az - az2) < 1e-10
    assert abs(el - el2) < 1e-10


# ── orbit ──────────────────────────────────────────────────────────────────

def test_orbit_radius_constant():
    from core.orbit import Satellite
    sat = Satellite('T', altitude=600e3, inclination_deg=53.0)
    for t in [0, 100, 500, 1000]:
        pos, _ = sat.get_state(t)
        r = np.linalg.norm(pos)
        assert abs(r - sat.r) / sat.r < 1e-10

def test_orbit_velocity_magnitude():
    from core.orbit import Satellite, MU_EARTH
    sat = Satellite('T', altitude=600e3, inclination_deg=0.0)
    pos, vel = sat.get_state(0)
    expected_v = np.sqrt(MU_EARTH / sat.r)
    assert abs(np.linalg.norm(vel) - expected_v) / expected_v < 1e-10


# ── pointing ───────────────────────────────────────────────────────────────

def test_naive_unit_vector():
    my_pos     = np.array([7000e3, 0, 0])
    target_pos = np.array([7000e3, 100e3, 0])
    v, _, _ = PointingAlgorithm.naive(my_pos, target_pos)
    assert abs(np.linalg.norm(v) - 1.0) < 1e-10

def test_lead_ahead_unit_vector():
    my_pos     = np.array([7000e3, 0, 0])
    target_pos = np.array([7000e3, 3000e3, 0])
    target_vel = np.array([0, 7500.0, 0])
    v, lead, tau = PointingAlgorithm.lead_ahead(my_pos, np.zeros(3), target_pos, target_vel)
    assert abs(np.linalg.norm(v) - 1.0) < 1e-10
    assert tau > 0

def test_lead_ahead_angle_approximate():
    """提前角 ≈ v_perp / c；用垂直于 LOS 的速度验证"""
    my_pos     = np.array([7000e3, 0, 0])
    target_pos = np.array([7000e3, 3000e3, 0])
    # LOS 方向为 [0,1,0]，取 X 方向速度（完全垂直）以产生最大提前角
    target_vel = np.array([7500.0, 0, 0])
    _, lead, _ = PointingAlgorithm.lead_ahead(my_pos, np.zeros(3), target_pos, target_vel)
    expected = 7500.0 / C_LIGHT  # ≈ 25 μrad
    assert abs(lead - expected) / expected < 0.1  # 10% 容差

def test_predictive_equals_lead_ahead_when_age_zero():
    my_pos     = np.array([7000e3, 0, 0])
    target_pos = np.array([7000e3, 3000e3, 0])
    target_vel = np.array([0, 7500.0, 0])
    v1, _, _ = PointingAlgorithm.lead_ahead(my_pos, np.zeros(3), target_pos, target_vel)
    v2, _, _ = PointingAlgorithm.predictive(my_pos, np.zeros(3), target_pos, target_vel, 0.0)
    assert np.allclose(v1, v2, atol=1e-10)


# ── coordinate ─────────────────────────────────────────────────────────────

def test_eci_vnc_roundtrip():
    from core.orbit import Satellite
    from core.coordinate import CoordinateTransform
    sat = Satellite('T', 600e3, 53.0)
    V, N, C = sat.get_vnc_axes(0)
    v_eci = np.array([0.3, 0.7, 0.6])
    v_vnc = CoordinateTransform.eci_to_vnc(v_eci, V, N, C)
    v_back = CoordinateTransform.vnc_to_eci(v_vnc, V, N, C)
    assert np.allclose(v_eci, v_back, atol=1e-10)


# ── error model ────────────────────────────────────────────────────────────

def test_ephemeris_error_magnitude():
    from core.error_model import ErrorModel
    cfg = {
        'ephemeris': {'position_std': 50.0, 'velocity_std': 0.1},
        'attitude':  {'static_bias': 1e-5, 'jitter_amplitude': 5e-6, 'jitter_freq': 100},
        'timing':    {'clock_offset': 1e-6}
    }
    em = ErrorModel(cfg, seed=0)
    pos = np.zeros(3)
    vel = np.zeros(3)
    errs = []
    for _ in range(1000):
        mp, mv = em.ephemeris_error(pos, vel)
        errs.append(np.linalg.norm(mp))
    mean_err = np.mean(errs)
    # 3D Gaussian: E[|x|] ≈ sqrt(2) * sigma * sqrt(3/2)
    assert mean_err < 200  # loose bound


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
