import yaml
from core.orbit import Satellite


class ScenarioManager:
    """从 YAML 配置文件加载场景，构建卫星对象"""

    def __init__(self, config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

    def build_satellites(self):
        def _build(name, cfg):
            return Satellite(name,
                             altitude=cfg['altitude'],
                             inclination_deg=cfg['inclination'],
                             raan_deg=cfg.get('raan', 0.0),
                             initial_phase_deg=cfg.get('initial_phase', 0.0))
        sat_A = _build('A', self.config['satellites']['sat_A'])
        sat_B = _build('B', self.config['satellites']['sat_B'])
        return sat_A, sat_B

    @property
    def sim_config(self):
        return self.config['simulation']

    @property
    def error_config(self):
        return self.config['error_model']

    @property
    def pat_config(self):
        return self.config['PAT']
