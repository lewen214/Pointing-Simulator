import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams['font.family'] = ['DejaVu Sans', 'SimHei', 'sans-serif']
matplotlib.rcParams['axes.unicode_minus'] = False


def plot_results(df, save_path='results/plots.png'):
    """6 子图：误差时序、Az/El 分量、PAT 状态、提前角、距离、误差分布"""
    fig, axes = plt.subplots(3, 2, figsize=(14, 10))

    t = df['t'].values

    # 1. 总指向误差（对数坐标）
    ax = axes[0, 0]
    ax.plot(t, df['total_error'].values * 1e6, lw=0.8)
    ax.set_ylabel('Total Error (μrad)')
    ax.set_yscale('log')
    ax.set_title('Pointing Error Over Time')
    ax.grid(True, which='both', alpha=0.4)

    # 2. Az/El 分量
    ax = axes[0, 1]
    ax.plot(t, df['az_error'].values * 1e6, lw=0.8, label='Azimuth')
    ax.plot(t, df['el_error'].values * 1e6, lw=0.8, label='Elevation', alpha=0.7)
    ax.set_ylabel('Error (μrad)')
    ax.set_title('Az/El Error Components')
    ax.legend()
    ax.grid(True, alpha=0.4)

    # 3. PAT 状态机
    ax = axes[1, 0]
    state_names = ['INIT', 'SCAN', 'ACQ', 'TRACK', 'LOST']
    ax.plot(t, df['pat_state'].values, lw=0.8, color='purple')
    ax.set_yticks(range(5))
    ax.set_yticklabels(state_names)
    ax.set_title('PAT State Machine')
    ax.grid(True, alpha=0.4)

    # 4. 提前角
    ax = axes[1, 1]
    ax.plot(t, df['lead_angle'].values * 1e6, lw=0.8, color='orange')
    ax.set_ylabel('Lead Angle (μrad)')
    ax.set_title('Point-Ahead Angle')
    ax.grid(True, alpha=0.4)

    # 5. 星间距离
    ax = axes[2, 0]
    ax.plot(t, df['distance'].values / 1e3, lw=0.8, color='green')
    ax.set_ylabel('Distance (km)')
    ax.set_xlabel('Time (s)')
    ax.set_title('Inter-satellite Distance')
    ax.grid(True, alpha=0.4)

    # 6. 跟踪误差分布
    ax = axes[2, 1]
    tracking = df[df['pat_state'] == 3]
    if len(tracking) > 0:
        err_urad = tracking['total_error'].values * 1e6
        ax.hist(err_urad, bins=50, alpha=0.7, color='steelblue')
        rms = np.sqrt(np.mean(err_urad**2))
        ax.set_xlabel('Pointing Error (μrad)')
        ax.set_ylabel('Count')
        ax.set_title(f'Tracking Error Distribution (RMS={rms:.2f} μrad)')
    else:
        ax.text(0.5, 0.5, 'No tracking data', ha='center', va='center',
                transform=ax.transAxes)
    ax.grid(True, alpha=0.4)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"Plot saved → {save_path}")


def plot_orbit_3d(sat_A, sat_B, duration=6000, dt=10, save_path='results/orbit_3d.png'):
    """绘制双星三维轨道"""
    from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

    times = np.arange(0, duration, dt)
    posA = np.array([sat_A.get_state(t)[0] for t in times]) / 1e6  # Mm
    posB = np.array([sat_B.get_state(t)[0] for t in times]) / 1e6

    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(111, projection='3d')

    # 地球球体（简化）
    u, v = np.mgrid[0:2*np.pi:40j, 0:np.pi:20j]
    Re = 6.378  # Mm
    ax.plot_surface(Re*np.cos(u)*np.sin(v), Re*np.sin(u)*np.sin(v),
                    Re*np.cos(v), alpha=0.2, color='cyan')

    ax.plot(*posA.T, lw=1.0, label='Sat A')
    ax.plot(*posB.T, lw=1.0, label='Sat B', linestyle='--')
    ax.set_xlabel('X (Mm)'); ax.set_ylabel('Y (Mm)'); ax.set_zlabel('Z (Mm)')
    ax.set_title('Satellite Orbits (3D)')
    ax.legend()

    plt.tight_layout()
    plt.savefig(save_path, dpi=120)
    plt.close(fig)
    print(f"Orbit plot saved → {save_path}")
