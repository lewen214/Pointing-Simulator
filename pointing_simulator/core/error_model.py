import numpy as np
from utils.math_utils import euler_to_dcm


class ErrorModel:
    """各误差源的物理建模"""

    def __init__(self, config, seed=42):
        self.cfg_eph = config['ephemeris']
        self.cfg_att = config['attitude']
        self.cfg_tim = config['timing']
        self.rng = np.random.default_rng(seed)

        # 固定静态偏差（每次仿真不变）
        bias = self.cfg_att['static_bias']
        self._roll_bias  = bias * np.sin(0.7)
        self._pitch_bias = bias * np.cos(0.3)
        self._yaw_bias   = bias * np.sin(1.2)

    def ephemeris_error(self, true_pos, true_vel):
        """注入星历位置/速度误差（高斯噪声）"""
        pos_err = self.rng.normal(0, self.cfg_eph['position_std'], 3)
        vel_err = self.rng.normal(0, self.cfg_eph['velocity_std'], 3)
        return true_pos + pos_err, true_vel + vel_err

    def attitude_error(self, t):
        """
        姿态误差 = 静态偏差 + 多频叠加高频抖动
        返回姿态偏差 DCM (3×3)
        """
        amp = self.cfg_att['jitter_amplitude']
        f   = self.cfg_att['jitter_freq']

        roll  = self._roll_bias  + amp * (np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*f*3.7*t))
        pitch = self._pitch_bias + amp * (np.cos(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*f*5.1*t))
        yaw   = self._yaw_bias   + amp * 0.6 * np.sin(2*np.pi*f*0.9*t)

        return euler_to_dcm(roll, pitch, yaw)

    def timing_error(self):
        """时钟偏差（秒）"""
        return float(self.rng.normal(0, self.cfg_tim['clock_offset']))

    def thermal_drift(self, t, period=5400.0):
        """
        轨道周期性热变形（阴影/光照区温差引起结构形变）
        period: 轨道周期 (s) ≈ 5400 s for 600 km
        """
        amp = 2e-5  # rad
        return amp * np.sin(2 * np.pi * t / period)
