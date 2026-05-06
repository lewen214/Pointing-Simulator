import numpy as np
from utils.math_utils import normalize, vector_to_azel


class CoordinateTransform:
    """
    坐标系层级：
      ECI (地心惯性系)
        └── VNC (卫星轨道坐标系: V速度/N法向/C径向)
              └── Body (卫星本体系，含姿态偏差)
                    └── Antenna (天线安装坐标系)
    """

    @staticmethod
    def eci_to_vnc(vec_eci, V, N, C):
        """ECI 矢量 → VNC 坐标"""
        DCM = np.array([V, N, C])
        return DCM @ vec_eci

    @staticmethod
    def vnc_to_eci(vec_vnc, V, N, C):
        """VNC 矢量 → ECI 坐标"""
        DCM = np.array([V, N, C]).T
        return DCM @ vec_vnc

    @staticmethod
    def vnc_to_body(vec_vnc, attitude_dcm):
        """VNC → 卫星本体系（含姿态误差）"""
        return attitude_dcm @ vec_vnc

    @staticmethod
    def body_to_antenna(vec_body, mounting_dcm):
        """本体系 → 天线坐标系（含安装矩阵）"""
        return mounting_dcm @ vec_body

    @staticmethod
    def compute_pointing_angles(target_pos_eci, my_pos_eci,
                                V, N, C, attitude_dcm=None,
                                mounting_dcm=None):
        """
        计算从本星指向目标所需的天线方位角/俯仰角。

        Returns:
            azimuth (rad), elevation (rad), los_body (3,)
        """
        los_eci = normalize(target_pos_eci - my_pos_eci)
        los_vnc = CoordinateTransform.eci_to_vnc(los_eci, V, N, C)

        if attitude_dcm is not None:
            los_body = CoordinateTransform.vnc_to_body(los_vnc, attitude_dcm)
        else:
            los_body = los_vnc

        if mounting_dcm is not None:
            los_ant = CoordinateTransform.body_to_antenna(los_body, mounting_dcm)
        else:
            los_ant = los_body

        az, el = vector_to_azel(los_ant)
        return az, el, los_ant
