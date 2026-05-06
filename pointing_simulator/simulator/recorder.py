import pandas as pd


class DataRecorder:
    """收集每个时间步的仿真数据，最终输出 DataFrame"""

    def __init__(self):
        self._rows = []

    def record(self, **kwargs):
        self._rows.append(kwargs)

    def get_data(self):
        return pd.DataFrame(self._rows)

    def save(self, path):
        df = self.get_data()
        df.to_csv(path, index=False)
        print(f"Data saved → {path}  ({len(df)} rows)")
        return df
