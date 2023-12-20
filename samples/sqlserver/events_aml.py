import logging
import os
import gevent
from gevent import monkey
from operator import itemgetter
import traceback
import json
from dataclasses import asdict, dataclass, field
from flask import Blueprint, request, session
from flask_socketio import SocketIO, emit
from typing import List, Dict

import urllib
from db_copilot.contract.tool_core import Cell

monkey.patch_all()
socketio = SocketIO(max_http_buffer_size=1e8)

events_blueprint = Blueprint('events', __name__)


AML_ENDPOINT_URL = None
AML_ENDPOINT_KEY = None
AML_EMDPOINT_DEPLOYMENT_NAME = None


@dataclass
class BotResponse:
    text: str
    schemas: Dict
    enableFeedback: bool = True
    sampleQueries: List[str] = field(default_factory=list)


class ProgressInfo:
    @classmethod
    def Connecting(cls, create: bool):
        return "Uploading the database" if create else "Verifying the database connection"

    @classmethod
    def Grounding(cls):
        return "Grounding in your database content and context"

@socketio.on('request')
def onRequest(data):
    message, db_id = itemgetter('message', 'tpromptSource')(data)
    progress = []
    progress.append(ProgressInfo.Connecting(False))
    emit('response', {'progress': progress}, to=request.sid)

    headers = {
        'Content-Type':'application/json',
        'Authorization':('Bearer '+ AML_ENDPOINT_KEY),
        'azureml-model-deployment': AML_EMDPOINT_DEPLOYMENT_NAME
    }

    is_summary = message == 'Show the DB summary.'

    if is_summary:
        data = {
            'request_type': 'Summary'
        }
    else:
        data = {
            'question': message
        }
    req = urllib.request.Request(AML_ENDPOINT_URL, json.dumps(data).encode("utf-8"), headers)

    try:
        response = urllib.request.urlopen(req)
        result = response.read()
        response_text = result.decode("utf-8")

        if is_summary:
            resp_dict = json.loads(response_text)
            emit('response', {
                'text': resp_dict['summary'],
                'schemas': resp_dict['schema'],
                'enableFeedback': False,
                'sampleQueries': []
            }, to=request.sid)
            return response_text
        else:
            cells_json = json.loads(response_text)
            cells = []
            for x in cells_json:
                cells.append(Cell.from_dict(x))
            logging.info(f"Response: {response_text}")
            resp = {
                    'text': [cell.to_dict() for cell in cells],
                    'status': 'success',
                    'finished': True,
                    'sampleQueries': []
            }
            emit('response', resp, to=request.sid)
            return response_text
    except Exception as err:
        emit('error', 'Internal Service Exception.', to=request.sid)
        emit('log', str(err) + ": " + str(traceback.format_exc()), to=request.sid)


@socketio.on('ping')
def onPing():
    emit('pong', to=request.sid)
