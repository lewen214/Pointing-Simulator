import numpy as np


def normalize(v):
    """向量归一化，防止零除"""
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def angle_between(v1, v2):
    """两向量夹角 (rad)"""
    cos_a = np.clip(np.dot(normalize(v1), normalize(v2)), -1.0, 1.0)
    return np.arccos(cos_a)


def quaternion_to_dcm(q):
    """四元数 [w, x, y, z] → 方向余弦矩阵"""
    w, x, y, z = q
    return np.array([
        [1 - 2*(y*y + z*z),  2*(x*y - w*z),      2*(x*z + w*y)],
        [2*(x*y + w*z),       1 - 2*(x*x + z*z),  2*(y*z - w*x)],
        [2*(x*z - w*y),       2*(y*z + w*x),       1 - 2*(x*x + y*y)]
    ])


def euler_to_dcm(roll, pitch, yaw):
    """欧拉角 ZYX → DCM"""
    cr, sr = np.cos(roll),  np.sin(roll)
    cp, sp = np.cos(pitch), np.sin(pitch)
    cy, sy = np.cos(yaw),   np.sin(yaw)

    Rx = np.array([[1, 0,   0  ], [0,  cr, -sr], [0, sr, cr]])
    Ry = np.array([[cp, 0, sp  ], [0,  1,   0 ], [-sp, 0, cp]])
    Rz = np.array([[cy, -sy, 0 ], [sy, cy,  0 ], [0,  0,  1]])
    return Rz @ Ry @ Rx


def vector_to_azel(v):
    """单位矢量 → 方位角/俯仰角 (rad)"""
    v = normalize(v)
    az = np.arctan2(v[1], v[0])
    el = np.arcsin(np.clip(v[2], -1.0, 1.0))
    return az, el


def azel_to_vector(az, el):
    """方位/俯仰角 → 单位矢量"""
    return np.array([
        np.cos(el) * np.cos(az),
        np.cos(el) * np.sin(az),
        np.sin(el)
    ])
