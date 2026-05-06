import numpy as np


def compute_metrics(df):
    """从仿真数据帧计算关键性能指标"""

    tracking = df[df['pat_state'] == 3]  # PATState.TRACKING = 3

    if len(tracking) == 0:
        return {"error": "Never entered tracking state — check SNR or scan config"}

    acq_rows = df[df['pat_state'] >= 2]

    metrics = {
        'acquisition_time_s':   float(acq_rows['t'].iloc[0]) if len(acq_rows) else None,
        'first_track_time_s':   float(tracking['t'].iloc[0]),
        'tracking_rms_urad':    float(np.sqrt(np.mean(tracking['total_error']**2)) * 1e6),
        'tracking_max_urad':    float(tracking['total_error'].max() * 1e6),
        'tracking_mean_urad':   float(tracking['total_error'].mean() * 1e6),
        'availability_pct':     float(len(tracking) / len(df) * 100),
        'mean_distance_km':     float(df['distance'].mean() / 1e3),
        'mean_lead_angle_urad': float(df['lead_angle'].mean() * 1e6),
        'mean_light_time_ms':   float(df['light_time'].mean() * 1e3),
    }
    return metrics


def print_report(metrics):
    print("\n" + "=" * 52)
    print("        指向算法仿真性能报告")
    print("=" * 52)
    for key, val in metrics.items():
        if isinstance(val, float):
            print(f"  {key:35s}: {val:10.4f}")
        else:
            print(f"  {key:35s}: {val}")
    print("=" * 52 + "\n")
