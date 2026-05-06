import numpy as np

MU_EARTH = 3.986004418e14  # m³/s²
R_EARTH = 6378137.0        # m


class Satellite:
    """圆轨道卫星动力学模型"""

    def __init__(self, name, altitude, inclination_deg,
                 raan_deg=0.0, initial_phase_deg=0.0):
        self.name = name
        self.r = R_EARTH + altitude
        self.inc = np.deg2rad(inclination_deg)
        self.raan = np.deg2rad(raan_deg)
        self.phase0 = np.deg2rad(initial_phase_deg)
        self.omega = np.sqrt(MU_EARTH / self.r ** 3)
        self.period = 2 * np.pi / self.omega

    def get_state(self, t):
        """
        返回 t 时刻 ECI 坐标系下的位置和速度
        Returns: position (3,), velocity (3,)  单位: m, m/s
        """
        theta = self.omega * t + self.phase0

        x_orb = self.r * np.cos(theta)
        y_orb = self.r * np.sin(theta)

        vx_orb = -self.r * self.omega * np.sin(theta)
        vy_orb = self.r * self.omega * np.cos(theta)

        cos_i, sin_i = np.cos(self.inc), np.sin(self.inc)
        cos_O, sin_O = np.cos(self.raan), np.sin(self.raan)

        # 轨道平面 → ECI: Rz(RAAN) * Rx(inc)
        R = np.array([
            [cos_O, -sin_O * cos_i,  sin_O * sin_i],
            [sin_O,  cos_O * cos_i, -cos_O * sin_i],
            [0,      sin_i,          cos_i]
        ])

        pos = R @ np.array([x_orb, y_orb, 0.0])
        vel = R @ np.array([vx_orb, vy_orb, 0.0])
        return pos, vel

    def get_vnc_axes(self, t):
        """
        返回 VNC 坐标系基底（速度/法向/径向）
        Returns: V, N, C  各为 (3,) 单位向量
        """
        pos, vel = self.get_state(t)
        V = vel / np.linalg.norm(vel)
        C = -pos / np.linalg.norm(pos)          # 指向地心
        N = np.cross(C, V)
        N = N / np.linalg.norm(N)
        C = np.cross(V, N)                       # 重新正交化
        return V, N, C
