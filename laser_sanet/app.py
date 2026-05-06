from flask import Flask, send_from_directory
import os

app = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    return send_from_directory(BASE, 'index.html')

if __name__ == '__main__':
    print('\n  ★  激光自组网仿真平台  —  http://127.0.0.1:5001\n')
    app.run(debug=False, port=5001)
