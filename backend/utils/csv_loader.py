import pandas as pd
from typing import List, Dict
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), '../data/dati.csv')



def load_data() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH)


def save_data(df: pd.DataFrame):
    df.to_csv(DATA_PATH, index=False)



def get_all_data() -> List[Dict]:
    df = load_data()
    return df.to_dict(orient='records')


def update_row(index: int, new_data: Dict):
    df = load_data()
    for key, value in new_data.items():
        df.at[index, key] = value
    save_data(df)
