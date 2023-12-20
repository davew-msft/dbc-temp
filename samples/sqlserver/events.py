import os
import gevent
from gevent import monkey
from operator import itemgetter
import traceback
import json
import copy
from dataclasses import asdict, dataclass, field
import requests
from flask import Blueprint, request, session
from flask_socketio import SocketIO, emit
from typing import List, Dict

from examples import EXAMPLES
from prompts import PROMPT_TEMPLATE

from db_copilot.chat import DefaultDialogueAgent
from db_copilot.follow_up import FollowUpQueryRewriteSkill
from db_copilot.in_context_learning.faiss import FaissInContextLearningAgent
from db_copilot.utils import OpenaiEmbeddings
from db_copilot.suggestion import SuggestionGenerationSkill
from db_copilot.tool import PythonExecuteTool, SQLExecuteTool
from db_copilot.planner import DefaultPlanner
from db_copilot.db_provider import DBProviderClientFactory, DBProviderServiceFactory
from db_copilot.contract.llm_core import LLMType
from db_copilot.llm import OpenaiChatLLM
from db_copilot.contract import DBProviderAgent
from db_copilot.contract.memory_core import MemoryItem

monkey.patch_all()
socketio = SocketIO(max_http_buffer_size=1e8)

events_blueprint = Blueprint('events', __name__)

current_file_path = os.path.abspath(__file__)
current_directory = os.path.dirname(current_file_path)

secret_file_path = os.path.join(current_directory, 'configs/secrets.json')
if os.path.isfile(secret_file_path):
    with open(secret_file_path) as f:
        SECRETS: dict = json.load(f)
else:
    SECRETS: dict = json.loads(os.environ["SECRETS"])

@dataclass
class BotResponse:
    text: str
    schemas: Dict
    enableFeedback: bool = True
    sampleQueries: List[str] = field(default_factory=list)


class DialogueSession:
    def __init__(self, message_history: List[MemoryItem] = []) -> None:
        self.message_history : List[MemoryItem] = message_history


class DBInfoSkill:
    def __init__(self, suggestion_skill: SuggestionGenerationSkill) -> None:
        self.suggestion_skill = suggestion_skill
        self._max_tables = 20

    def generate(self, db_provider: DBProviderAgent, suggest_sample_queries: bool = False, annotation_mode: bool = False):
        schemas = db_provider.retrieve_schema(None)
        schemas_as_string = schemas.as_prompt_text(max_tables=self._max_tables)
        schemas_as_dict = schemas.to_dict()

        completion = f'This database contains the following tables:\n```data\n' + schemas_as_string + '\n```'
        suggestions = self.suggestion_skill.generate(schemas, [], num=3, creative=annotation_mode) if suggest_sample_queries else []
        return BotResponse(
            text=completion,
            schemas=schemas_as_dict,
            enableFeedback=False,
            sampleQueries=suggestions
        )


class ProgressInfo:
    @classmethod
    def Connecting(cls, create: bool):
        return "Uploading the database" if create else "Verifying the database connection"

    @classmethod
    def Grounding(cls):
        return "Grounding in your database content and context"


llm = OpenaiChatLLM(
    api_base=SECRETS['AOAI-API-BASE'],
    api_key=SECRETS['AOAI-KEY'],
    model=SECRETS['TURBO_DEPLOYMENT'],
    llm_type=LLMType.GPT35_TURBO
)

aoai_api_base = SECRETS['AOAI-API-BASE']
embedding_deployment = SECRETS['EMBEDDING_DEPLOYMENT']
icl_agent = FaissInContextLearningAgent.from_question_response_session_list(
    OpenaiEmbeddings(
        f'{aoai_api_base}openai/deployments/{embedding_deployment}/embeddings?api-version=2023-03-15-preview',
        SECRETS['AOAI-KEY'],
        SECRETS['EMBEDDING_DEPLOYMENT']
    ),
    EXAMPLES
)

try:
    _db_factory = DBProviderClientFactory.from_api('http://127.0.0.1:3300/score')
except:
    _db_factory = DBProviderServiceFactory.from_configs(json.loads(os.getenv("DB_CONFIG_JSON")), capacity=1_000)

_db_info_skill = DBInfoSkill(suggestion_skill=SuggestionGenerationSkill(llm=llm))


@socketio.on('request')
def onRequest(data):
    progress = []
    try:
        message, db_id = itemgetter('message', 'tpromptSource')(data)
        progress.append(ProgressInfo.Connecting(False))
        emit('response', {'progress': progress}, to=request.sid)

        dbcopilot_session = session.get(request.sid, None)
        if dbcopilot_session is None:
            dbcopilot_session = DialogueSession()

        session[request.sid] = dbcopilot_session

        try:
            db_provider = _db_factory.get_db_provider(db_id)
        except Exception as err:
            emit('error', json.dumps({"answer": 'Database connection error.'}), to=request.sid)
            emit('log', str(err) + ": " + str(traceback.format_exc()), to=request.sid)
            return

        if (message == 'Show the DB summary.'):
            response = _db_info_skill.generate(db_provider)
            emit('response', asdict(response), to=request.sid)

            socketio.sleep(0.075)
        else:
            dialogue_agent = DefaultDialogueAgent(
                db_provider,
                icl_agent,
                DefaultPlanner(
                    tool_dict={
                        db_provider.sql_dialect.value: SQLExecuteTool(db_provider),
                        'python': PythonExecuteTool()
                    },
                    llm=llm,
                    system_interrupt_message_template=DefaultPlanner.DEFAULT_SYSTEM_INTERRUPT_MESSAGE_TEMPLATE # this is a string template that you can customize
                ),
                instruct_template=PROMPT_TEMPLATE,
                follow_up_skill=FollowUpQueryRewriteSkill(llm),
                suggestion_skill=_db_info_skill.suggestion_skill
            )

            response_generator = dialogue_agent.interact(question=message, memory=dbcopilot_session.message_history)

            last_response = None
            suggestion_task = gevent.spawn(dialogue_agent.suggest, message, dbcopilot_session.message_history, 3)
            for response in response_generator:
                resp = {
                        'text': [cell.to_dict() for cell in response.cells],
                        'status': 'success',
                        'finished': False,
                        'sampleQueries': []
                }
                emit('response', resp, to=request.sid)
                last_response = response
            
            def get_sample_queries():
                suggestion_task.join()
                val = suggestion_task.value
                return ([] if val is None else val)

            resp = {
                    'text': [cell.to_dict() for cell in last_response.cells],
                    'status': 'success',
                    'finished': True,
                    'sampleQueries': get_sample_queries()
            }
            emit('response', resp, to=request.sid)
            dbcopilot_session.message_history = copy.copy(last_response.memory)
    except requests.exceptions.HTTPError as err:
        emit('error', err.response.text, to=request.sid)
        emit('log', str(err) + ": " + str(traceback.format_exc()), to=request.sid)
    except Exception as err:
        emit('error', 'Internal Service Exception.', to=request.sid)
        emit('log', str(err) + ": " + str(traceback.format_exc()), to=request.sid)


@socketio.on('connect')
def onConnect():
    session[request.sid] = DialogueSession()


@socketio.on('disconnect')
def onDisconnect():
    session.pop(request.sid, None)


@socketio.on('ping')
def onPing():
    emit('pong', to=request.sid)
