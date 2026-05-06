import numpy as np
import yaml

from core.orbit import Satellite
from core.coordinate import CoordinateTransform
from core.pointing import PointingAlgorithm
from core.error_model import ErrorModel
from core.pat_controller import PATController, PATState, GimbalDynamics
from simulator.recorder import DataRecorder
from utils.math_utils import normalize


class SimulationEngine:
    """
    仿真主引擎：整合轨道/坐标/指向/误差/PAT 模块，逐步推进时间。
    """

    def __init__(self, config_path, algorithm='lead_ahead'):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

        sim = self.config['simulation']
        self.dt       = sim['dt']
        self.duration = sim['duration']
        self.seed     = sim.get('random_seed', 42)
        self.algorithm = algorithm  # 'naive' | 'light_time' | 'lead_ahead' | 'predictive'

        # 卫星（YAML 键名 → Satellite 参数名映射）
        def _build_sat(name, cfg):
            return Satellite(
                name,
                altitude=cfg['altitude'],
                inclination_deg=cfg['inclination'],
                raan_deg=cfg.get('raan', 0.0),
                initial_phase_deg=cfg.get('initial_phase', 0.0),
            )
        self.sat_A = _build_sat('A', self.config['satellites']['sat_A'])
        self.sat_B = _build_sat('B', self.config['satellites']['sat_B'])

        # 误差模型
        err_cfg = self.config['error_model']
        self.err_A = ErrorModel(err_cfg, seed=self.seed + 1)
        self.err_B = ErrorModel(err_cfg, seed=self.seed + 2)

        # 控制器
        self.pat    = PATController(self.config['PAT'])
        self.gimbal = GimbalDynamics(bandwidth_Hz=10, damping=0.7)

        self.recorder = DataRecorder()

    # ------------------------------------------------------------------
    def run(self):
        steps = int(self.duration / self.dt)
        print(f"Simulation start: duration={self.duration}s  dt={self.dt}s  "
              f"steps={steps}  algorithm={self.algorithm}")

        t = 0.0
        for step in range(steps):
            self._step(t)
            t += self.dt

            if step % max(1, steps // 20) == 0:
                state = self.pat.state.name
                err = self.pat._lost_count  # quick proxy
                print(f"  t={t:6.1f}s  state={state}")

        print("Simulation done.")
        return self.recorder.get_data()

    # ------------------------------------------------------------------
    def _step(self, t):
        # === 真值 ===
        pos_A, vel_A = self.sat_A.get_state(t)
        pos_B, vel_B = self.sat_B.get_state(t)
        V_A, N_A, C_A = self.sat_A.get_vnc_axes(t)

        # === 带误差的 B 状态（A 观测到的） ===
        meas_pos_B, meas_vel_B = self.err_A.ephemeris_error(pos_B, vel_B)
        att_dcm_A = self.err_A.attitude_error(t)

        # === 指向算法 ===
        if self.algorithm == 'naive':
            dir_cmd, lead_angle, tau = PointingAlgorithm.naive(pos_A, meas_pos_B)
        elif self.algorithm == 'light_time':
            dir_cmd, lead_angle, tau = PointingAlgorithm.light_time_corrected(
                pos_A, meas_pos_B, meas_vel_B)
        elif self.algorithm == 'predictive':
            dir_cmd, lead_angle, tau = PointingAlgorithm.predictive(
                pos_A, vel_A, meas_pos_B, meas_vel_B, ephemeris_age=0.05)
        else:  # lead_ahead（默认）
            dir_cmd, lead_angle, tau = PointingAlgorithm.lead_ahead(
                pos_A, vel_A, meas_pos_B, meas_vel_B)

        # 指向矢量 → 天线 Az/El（含姿态误差）
        tgt_for_calc = pos_A + dir_cmd * np.linalg.norm(meas_pos_B - pos_A)
        tgt_az, tgt_el, _ = CoordinateTransform.compute_pointing_angles(
            tgt_for_calc, pos_A, V_A, N_A, C_A, att_dcm_A)

        # === 理想指向（无误差基准） ===
        true_dir, _, _ = PointingAlgorithm.lead_ahead(pos_A, vel_A, pos_B, vel_B)
        true_tgt = pos_A + true_dir * np.linalg.norm(pos_B - pos_A)
        true_az, true_el, _ = CoordinateTransform.compute_pointing_angles(
            true_tgt, pos_A, V_A, N_A, C_A)

        # Az/El 差（用于 PI 修正，做环绕防 ±π 跳变）
        az_err = ((tgt_az - true_az) + np.pi) % (2 * np.pi) - np.pi
        el_err = tgt_el - true_el

        # 总角度误差：用矢量夹角，避免 el≈±90° 奇点放大 az_err
        from utils.math_utils import azel_to_vector, angle_between as _ang
        vec_tgt  = azel_to_vector(tgt_az,  tgt_el)
        vec_true = azel_to_vector(true_az, true_el)
        total_err_angle = _ang(vec_tgt, vec_true)

        # === 转台动力学 ===
        # PAT 状态机用 total_err_angle；PI 修正用 az_err/el_err
        cmd_az, cmd_el, state = self.pat.update(
            t, self.dt, tgt_az, tgt_el, az_err, el_err,
            total_err_override=total_err_angle)
        delta_az = cmd_az - tgt_az
        delta_el = cmd_el - tgt_el
        act_d_az, act_d_el = self.gimbal.step(delta_az, delta_el, self.dt)
        actual_az = tgt_az + act_d_az
        actual_el = tgt_el + act_d_el

        # === 记录 ===
        self.recorder.record(
            t=t,
            distance=float(np.linalg.norm(pos_B - pos_A)),
            lead_angle=float(lead_angle),
            light_time=float(tau),
            az_error=float(az_err),
            el_error=float(el_err),
            total_error=float(total_err_angle),
            pat_state=int(state.value),
            cmd_az=float(cmd_az),
            cmd_el=float(cmd_el),
            actual_az=float(actual_az),
            actual_el=float(actual_el),
        )
