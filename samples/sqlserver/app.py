import argparse
import os
from gevent import monkey

monkey.patch_all()

import logging
from flask import Flask
from flask_session import Session
from api import api as api_blueprint, set_db_configs

parser = argparse.ArgumentParser()
parser.add_argument('--aml_endpoint_url', type=str, default=os.environ.get('aml_endpoint_url'))
parser.add_argument('--aml_endpoint_key', type=str, default=os.environ.get('aml_endpoint_key'))
parser.add_argument('--aml_endpoint_deployment_name', type=str, default=os.environ.get('aml_endpoint_deployment_name'))

args, unknown = parser.parse_known_args()

if not args.aml_endpoint_url:
    from events import socketio, events_blueprint
    set_db_configs(is_aml=False)
else:
    set_db_configs(is_aml=True)
    from events_aml import socketio, events_blueprint
    import events_aml
    events_aml.AML_ENDPOINT_URL = args.aml_endpoint_url
    events_aml.AML_ENDPOINT_KEY = args.aml_endpoint_key
    events_aml.AML_EMDPOINT_DEPLOYMENT_NAME = args.aml_endpoint_deployment_name


app = Flask(__name__, static_folder=os.path.join('client', 'build'))
app.register_blueprint(events_blueprint)
app.register_blueprint(api_blueprint)

Session(app)

socketio.init_app(app, cors_allowed_origins="*", logger=True,
                  engineio_logger=True, async_mode='gevent',
                  ping_timeout=30
    )
logging.getLogger("socketio.server").setLevel(logging.WARNING)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', use_reloader=False, port=5000, debug=True)
