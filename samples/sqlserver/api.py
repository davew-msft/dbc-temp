import json
import os
from flask import Blueprint, send_from_directory, jsonify
from flask_cors import CORS

api = Blueprint('api', __name__)
CORS(api)

STATIC_FOLDER = os.path.join('client', 'build')
current_file_path = os.path.abspath(__file__)
current_directory = os.path.dirname(current_file_path)

DB_CONFIGS = None

def set_db_configs(is_aml=False):
    global DB_CONFIGS
    if not is_aml:
        db_config_file_path = os.path.join(current_directory, 'configs/db_flask_config.json')
        if os.path.isfile(db_config_file_path):
            with open(db_config_file_path) as f:
                DB_CONFIGS = json.load(f)
        else:
            DB_CONFIGS = json.loads(os.environ.get("DB_CONFIG_JSON", '{}'))
    else:
        DB_CONFIGS = [
            {
                "db_id": "AML_ENDPOINT"
            }
        ]

@api.route('/api/getTPromptSources', methods=['GET'])
def getTPromptSources():
    data = [x['db_id'] for x in DB_CONFIGS]
    return jsonify(data), 200

@api.route('/api/getSampleQueries', methods=['GET'])
def getSampleQueries():
    data = {}
    for x in DB_CONFIGS:
        data[x['db_id']]=[]
        try:
            for query in x['sampleQueries']:
                data[x['db_id']].append({'name': query, 'isHighlight':True})
        except:
            pass
    return jsonify(data), 200


@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def catch_all(path):
    if path != "" and os.path.exists(STATIC_FOLDER + '/' + path):
        return send_from_directory(STATIC_FOLDER, path)
    else:
        return send_from_directory(STATIC_FOLDER, 'index.html')
