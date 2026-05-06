import numpy as np
from utils.math_utils import normalize, angle_between

C_LIGHT = 299792458.0  # m/s


class PointingAlgorithm:
    """位置指向算法：四种逐步精化的方法"""

    @staticmethod
    def naive(my_pos, target_pos):
        """
        朴素指向：直接指向目标当前位置。
        不考虑光行时，目标高速运动时误差大。
        """
        return normalize(target_pos - my_pos), 0.0, 0.0

    @staticmethod
    def light_time_corrected(my_pos, target_pos, target_vel, max_iter=5):
        """
        光行时修正：迭代求解信号到达时的目标位置。
        t_light = |r_target(t - t_light) - r_self| / c
        """
        distance = np.linalg.norm(target_pos - my_pos)
        t_light = distance / C_LIGHT

        for _ in range(max_iter):
            target_past = target_pos - target_vel * t_light
            distance = np.linalg.norm(target_past - my_pos)
            t_light = distance / C_LIGHT

        los = normalize(target_past - my_pos)
        return los, 0.0, t_light

    @staticmethod
    def lead_ahead(my_pos, my_vel, target_pos, target_vel):
        """
        提前量算法（Point-Ahead）：
        激光从 A 发出 → 经过 τ 秒到达 B 的未来位置。
        提前角典型值 ≈ 2·v_perp/c ≈ 20–50 μrad。
        """
        rel_pos = target_pos - my_pos
        distance = np.linalg.norm(rel_pos)
        tau = distance / C_LIGHT

        # 迭代收敛（3次即可）
        for _ in range(3):
            target_future = target_pos + target_vel * tau
            los = target_future - my_pos
            tau = np.linalg.norm(los) / C_LIGHT

        pointing_dir = normalize(los)

        # 提前角 = 指向矢量与朴素方向的夹角
        naive_dir = normalize(rel_pos)
        lead_angle = angle_between(pointing_dir, naive_dir)

        return pointing_dir, lead_angle, tau

    @staticmethod
    def predictive(my_pos, my_vel, target_pos, target_vel,
                   ephemeris_age=0.0):
        """
        预测式指向：先把过期星历外推到当前时刻，再做提前量补偿。
        ephemeris_age: 星历数据的"年龄" (s)
        """
        target_now = target_pos + target_vel * ephemeris_age
        my_now = my_pos + my_vel * ephemeris_age
        return PointingAlgorithm.lead_ahead(my_now, my_vel, target_now, target_vel)
