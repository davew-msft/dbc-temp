import React, { useState, useRef, useEffect } from 'react';
import '@chatui/core/dist/index.css';

import './App.css';
import './chatui-theme.css';

import Chat, { useMessages } from '@chatui/core';
import '@chatui/core/dist/index.css';

import NavBar from './NavBar'
import io from 'socket.io-client';
import axios from 'axios';

import config from 'config';

import { parseMessageContent, renderMessageContent } from './Message';

const socketEndpoint = config.endpoint;

const DEFAULT_DB_SUMMARY_MESSAGE = "Show the DB summary.";

function App() {
  const [tpromptSourceOptions, setTPromptSourceChoices] = useState([]);
  
  const [tpromptSource, setTPromptSource] = useState('');

  const { messages, appendMsg, setTyping, updateMsg, resetList } = useMessages([]);
  
  const [sampleQueries, setSampleQueries] = useState([]);
  const [quickReplyVisible, setQuickReplyVisible] = useState(true);


  const chatConnection = useRef(null);
  const messageContents = useRef({});

  useEffect(() => {
    openNewWebSocket();
    getTPromptSourceOptions();
    getSampleQueries();
 
    return () => {
      closeWebSocket();
      
    }
  }, []);

  useEffect(() => {
    console.log(tpromptSource)
    if (tpromptSource.length > 0 && tpromptSourceOptions.map(x => x.name).includes(tpromptSource)) {
      handlePartialRefresh()
      handleSend('hello', DEFAULT_DB_SUMMARY_MESSAGE)
      getSampleQueries();
    }
    else if (tpromptSource.length > 0) {
      handlePartialRefresh()
      handleSend('hello', DEFAULT_DB_SUMMARY_MESSAGE, tpromptSource)
      getSampleQueries();
    }
  }, [tpromptSource]);
  

  const openNewWebSocket = () => {
    closeWebSocket();
    chatConnection.current = new io(socketEndpoint, { maxHttpBufferSize : 1e8 });

    chatConnection.current.on('ping', (data) => {
      chatConnection.current.emit('pong', data);
    });
  }

  const closeWebSocket = () => {
    if (chatConnection.current) {
      chatConnection.current.disconnect();
    }
  }

  const getTPromptSourceOptions = () => {
    axios.get('/api/getTPromptSources')
      .then((response) => {
          const data = response.data
          setTPromptSourceChoices(data);
          setTPromptSource(data[0]);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const getSampleQueries = () => {
    axios.get('/api/getSampleQueries')
      .then((response) => {
        setSampleQueries(response.data);
        setQuickReplyVisible(true);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const handlePartialRefresh = () => {
    openNewWebSocket();
    resetList();
  }

  const handleSend = (type, val) => {
    if (val.trim().length == 0){
      return
    }

    if (type != 'hello') {
      setQuickReplyVisible(false)
    }

    let userMessageId = type === 'hello' ? 0 : messages.length;
    let botMessageId = userMessageId + 1;
    appendMsg({
      type: 'text',
      content: { text: val },
      position: 'right',
      _id: userMessageId,
    });

    let hasResponse = false;
    let responseCallback = (data) => {
      try {
        if (!hasResponse) {
          hasResponse = true;
          messageContents.current[botMessageId] = parseMessageContent(data, setSampleQueries, setQuickReplyVisible)
          appendMsg({
            type: 'rich-text',
            position: 'left',
            content: messageContents.current[botMessageId],
            _id: botMessageId,
          });
        } else {
          messageContents.current[botMessageId] = parseMessageContent(data, setSampleQueries, setQuickReplyVisible)
          updateMsg(botMessageId, {
            type: 'rich-text',
            content: messageContents.current[botMessageId],
          });
        }
      }
      catch (e) {
        console.error(e);
        console.log(messages);
      }
    };

    let errorCallback = (err) => {
      console.error(err);
      appendMsg({
        type: 'text',
        content: { text: err },
        position: 'left',
        _id: botMessageId,
      });
    };

    let logCallback = (info) => {
      console.log(info);
    };

    let sourceStr = tpromptSourceOptions.includes(tpromptSource) ? tpromptSource : JSON.parse(tpromptSource).source
    
    let requestData = {
      message: val,
      tpromptSource: sourceStr
    }

    chatConnection.current.removeAllListeners('response');
    chatConnection.current.on('response', responseCallback);

    chatConnection.current.removeAllListeners('error');
    chatConnection.current.on('error', errorCallback);

    chatConnection.current.removeAllListeners('log');
    chatConnection.current.on('log', logCallback);

    chatConnection.current.emit('request', requestData, () => {});
  }

  const handleQuickReplyClick = (reply) => {
    setQuickReplyVisible(false);
    handleSend('text', reply.name);
  }
  return (
    <div>
      <NavBar
        sampleDbOptions = {tpromptSourceOptions}
        setSource = {setTPromptSource}
        handlePartialRefresh = {() => {handlePartialRefresh(); handleSend('hello', DEFAULT_DB_SUMMARY_MESSAGE); }}
      />
      <div style={{
            /*paddingLeft: sidebarOpen ? "13vw" : "5vw",*/
            height: "92vh"
          }}>
        <Chat
            locale='en-US'
            placeholder="Type your message here..."
            messages={messages}
            quickReplies={sampleQueries[tpromptSource] ?? sampleQueries ?? []}
            onQuickReplyClick={handleQuickReplyClick}
            quickRepliesVisible={quickReplyVisible}
            renderMessageContent={renderMessageContent}
            onSend={handleSend}
        />
      </div>
    </div>
  );
}

export default App;
