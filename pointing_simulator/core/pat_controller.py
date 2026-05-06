import numpy as np
from enum import Enum


class PATState(Enum):
    INITIAL     = 0
    SCANNING    = 1  # 螺旋扫描捕获
    ACQUISITION = 2  # 粗瞄
    TRACKING    = 3  # 精瞄跟踪
    LOST        = 4


class PATController:
    """
    指向-捕获-跟踪 (PAT) 闭环控制器。
    含防震荡滞后机制（论文展望部分的实现）。
    """

    def __init__(self, config):
        self.acq_thr   = config['acquisition_threshold']  # rad
        self.track_thr = config['tracking_threshold']     # rad
        self.state     = PATState.INITIAL

        # PI 控制器
        self.Kp = 0.8
        self.Ki = 0.1
        self.integral = np.zeros(2)

        # 防震荡参数
        self._lost_count  = 0
        self._lost_limit  = 100        # 连续 N 步才切回扫描
        self._cooldown    = 2.0        # 切换冷却时间 (s)
        self._last_switch = -10.0

        # 螺旋扫描状态
        self._scan_t0 = 0.0

    # ------------------------------------------------------------------
    def spiral_scan_offset(self, t, scan_radius=50e-6):
        """阿基米德螺旋扫描偏移量 (az, el) in rad"""
        elapsed = t - self._scan_t0
        omega   = 2 * np.pi * 5       # 5 Hz 旋转
        a       = scan_radius / (20 * 2 * np.pi)
        r       = a * omega * elapsed
        r       = min(r, scan_radius)
        return r * np.cos(omega * elapsed), r * np.sin(omega * elapsed)

    # ------------------------------------------------------------------
    def update(self, t, dt, target_az, target_el,
               measured_az_err, measured_el_err,
               total_err_override=None):
        """
        单步更新。

        Parameters
        ----------
        t              : 当前仿真时刻 (s)
        dt             : 时间步长 (s)
        target_az/el   : 算法给出的目标指向 (rad)
        measured_az/el_err : 指向残差（用于 PI 修正）(rad)
        total_err_override : 若提供，用此值做状态机门限判断（避免 Az/El 奇点）

        Returns
        -------
        cmd_az, cmd_el : 天线指令 (rad)
        state          : 当前 PATState
        """
        if total_err_override is not None:
            total_err = total_err_override
        else:
            total_err = np.sqrt(measured_az_err**2 + measured_el_err**2)

        if self.state in (PATState.INITIAL, PATState.SCANNING, PATState.LOST):
            if self.state == PATState.INITIAL:
                self._scan_t0 = t
                self.state = PATState.SCANNING

            off_az, off_el = self.spiral_scan_offset(t)
            cmd_az = target_az + off_az
            cmd_el = target_el + off_el

            if (total_err < self.acq_thr and
                    (t - self._last_switch) > self._cooldown):
                self.state = PATState.ACQUISITION
                self._last_switch = t
                self._lost_count  = 0

        elif self.state == PATState.ACQUISITION:
            cmd_az = target_az
            cmd_el = target_el

            if total_err < self.track_thr:
                self.state    = PATState.TRACKING
                self.integral = np.zeros(2)
                self._last_switch = t

        elif self.state == PATState.TRACKING:
            # PI 闭环修正残差（积分限幅防 windup）
            _ilim = self.acq_thr * 5
            self.integral[0] = np.clip(self.integral[0] + measured_az_err * dt, -_ilim, _ilim)
            self.integral[1] = np.clip(self.integral[1] + measured_el_err * dt, -_ilim, _ilim)
            cmd_az = target_az - (self.Kp * measured_az_err + self.Ki * self.integral[0])
            cmd_el = target_el - (self.Kp * measured_el_err + self.Ki * self.integral[1])

            # 防震荡：连续超阈才退出
            if total_err > self.acq_thr * 2:
                self._lost_count += 1
                if (self._lost_count > self._lost_limit and
                        (t - self._last_switch) > self._cooldown):
                    self.state = PATState.LOST
                    self._last_switch = t
                    self._scan_t0 = t
            else:
                self._lost_count = 0

        else:
            cmd_az, cmd_el = target_az, target_el

        return cmd_az, cmd_el, self.state


# ------------------------------------------------------------------
class GimbalDynamics:
    """
    粗瞄二轴转台二阶动力学。
    跟踪的是偏差 delta（相对开环指向的修正量），而非绝对角度，
    避免初始化大角度引起的数值溢出。
    """

    def __init__(self, bandwidth_Hz=10.0, damping=0.7):
        self.wn   = 2 * np.pi * bandwidth_Hz
        self.zeta = damping
        # state = [delta_az, delta_az_dot, delta_el, delta_el_dot]
        self.state = np.zeros(4)
        # 加速度上限，防止数值发散
        self._acc_limit = 50.0  # rad/s²

    def step(self, cmd_delta_az, cmd_delta_el, dt):
        """
        cmd_delta_*: 期望的指向修正量 (rad)，由 PAT 闭环给出。
        返回实际修正量 (az_out, el_out)。
        """
        daz, daz_dot, del_, del_dot = self.state

        az_ddot = np.clip(
            self.wn**2 * (cmd_delta_az - daz) - 2*self.zeta*self.wn * daz_dot,
            -self._acc_limit, self._acc_limit)
        el_ddot = np.clip(
            self.wn**2 * (cmd_delta_el - del_) - 2*self.zeta*self.wn * del_dot,
            -self._acc_limit, self._acc_limit)

        daz     += daz_dot * dt
        daz_dot += az_ddot * dt
        del_    += del_dot * dt
        del_dot += el_ddot * dt

        self.state = np.array([daz, daz_dot, del_, del_dot])
        return daz, del_
