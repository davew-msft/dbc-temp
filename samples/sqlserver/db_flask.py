import logging
import os
from flask import Flask, request
from db_copilot.db_provider.db_provider_api import init, run_db_provider

current_file_path = os.path.abspath(__file__)  
current_directory = os.path.dirname(current_file_path)

# creating a Flask app
app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG, filename=os.path.join(current_directory, 'db_provider.log'), filemode="w")

@app.route('/score', methods = ['POST'])
def score():
    data = request.json
    return run_db_provider(data)

def create_app():
    os.environ["DB_CONFIG_JSON"] = open(os.path.join(current_directory, "configs/db_flask_config.json")).read()
    init()
    return app

# driver function
if __name__ == '__main__':
    create_app()
    app.run(debug = False, host="0.0.0.0", port=3300)
