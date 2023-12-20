import React from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { Bubble, RichText } from '@chatui/core';

import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import hljs from 'highlight.js';
import { Typography } from '@mui/material';

import CodeInterpreterComponent from './CodeInterpreterComponent';
import { DatabaseSchema } from './tabulate';


const mdParser = new Remarkable('full', {
    html: true,        // Enable HTML tags in source
    xhtmlOut: false,        // Use '/' to close single tags (<br />)
    breaks: false,        // Convert '\n' in paragraphs into <br>
    langPrefix: 'language-',  // CSS language prefix for fenced blocks
    linkTarget: '',           // set target to open link in

    // Enable some language-neutral replacements + quotes beautification
    typographer: false,

    // Highlighter function. Should return escaped HTML,
    // or '' if input not changed
    // Allow to specify language/alias in fenced blocks
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
        try {
            return hljs.highlight(str, { language: lang }).value;
        } catch (__) { return ''; }
        }
        else {
        try {
            return hljs.highlightAuto(str).value;
        } catch (__) { return ''; }
        }
    }
}).use(linkify);
mdParser.inline.ruler.enable(['sup']);

export const parseMessageContent = (addedData, setSampleQueries, setQuickReplyVisible) => {
    let sqlData = null;

    if (addedData.sampleQueries && addedData.sampleQueries.length > 0) {
        setSampleQueries(addedData.sampleQueries)
        setQuickReplyVisible(true);
    }

    if (addedData.schemas) {
        addedData.text = null;
    }

    let currMessageContent = {
        dataElements: addedData.text,
        enable_feedback: addedData.enableFeedback ?? true,
        schemaData: addedData.schemas,
        progress: addedData.progress ?? [],
        status: addedData.status ? addedData.status : "success",
        finished: addedData.finished ?? false
    };
    return currMessageContent
}

export const renderMessageContent = (msg) => {

    const {type, content} = msg

    switch (type) {
        case 'image':
          return (
            <Bubble type="image">
              <img src={content} alt="" />
            </Bubble>
          );
        case 'text':
          return <Bubble content={content.text} />;
        case 'rich-text':
            const isSuccessfulItem = (itemContent) => {
                return itemContent.code_info?.code_execute_result?.data;
            }
        
            const countMatches = (string, subString) => {
                return (string.match(new RegExp(subString, "g")) || []).length;
            }
        
            const formatCode = (text) => {
                let formatted_text = text;
                if (countMatches(text, '```') % 2 === 1) {
                    formatted_text = text + '\n```';
                } else if (countMatches(text, '`') % 2 === 1) {
                    formatted_text = text + '`';
                }
                return formatted_text;
            }
            
            let mergedContents = []
            if (content.dataElements) {
                for (let i = 0; i < content.dataElements.length; i++) {
                    let curItem = content.dataElements[i]
                    if (!curItem.content.includes("```")) {
                        mergedContents.push(<RichText content={mdParser.render(formatCode(curItem.content))} />);
                    }
                    else if (curItem.code_info?.code_execute_result && !isSuccessfulItem(curItem)) {
                        let mergedHTML =  "code_id = '" + curItem.code_info.code_id + "'\n" + mdParser.render(formatCode(curItem.content))
                        let mergedMd = curItem.content
                        let mergedResult = curItem.code_info.code_execute_result
                        while (i+1 < content.dataElements.length) {
                            let nextItem = content.dataElements[i+1]
                            if (nextItem.code_info) {
                                mergedHTML = mergedHTML + "\n\n" + "code_id = '" + nextItem.code_info.code_id + "'\n" + mdParser.render(formatCode(nextItem.content))
                            }
                            else {
                                mergedHTML = mergedHTML + "\n\n" + mdParser.render(formatCode(nextItem.content))
                            }
                            
                            // Only keep the final md
                            mergedMd = nextItem.content
                            
                            i++;
                            if (isSuccessfulItem(nextItem)) {
                                mergedResult = nextItem.code_info.code_execute_result
                                break;
                            }
                        }

                        mergedContents.push(<CodeInterpreterComponent
                            code_md={mergedMd}
                            code_html={mergedHTML}
                            result={mergedResult}
                            finished={content.finished}
                        />)
                    }
                    else {
                        let cur_code_html = mdParser.render(formatCode(curItem.content))
                        if (curItem.code_info) {
                            cur_code_html = "code_id = '" + curItem.code_info?.code_id + "'\n" + cur_code_html
                        }
                        mergedContents.push(<CodeInterpreterComponent
                            code_md={curItem.content}
                            code_html={cur_code_html}
                            result={curItem.code_info?.code_execute_result}
                            finished={content.finished}
                        />)
                    }
                }
            }
            return (
                <Bubble>
                    {
                        content.dataElements &&
                        mergedContents.map((item, i) =>
                        <div key={i}>
                            {item}
                        </div>
                        )
                    }
                    {
                        content.schemaData &&
                        <DatabaseSchema schemas={content.schemaData} />
                    }
                    {
                        content.progress && content.progress.length > 0 &&
                        content.progress.map((item, i) => <Typography key={i}>{item}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{i < content.progress.length - 1 ? <CheckCircleIcon color='primary'/> : <CircularProgress size={20} />}</Typography>)
                    }
                    {
                        (!content.finished) && content.dataElements?.length > 0 &&
                        <CircularProgress size={20} />
                    }
                    {
                        content.finished && content.dataElements?.length > 0 &&
                        <CheckCircleIcon color='primary'/>
                    }
                </Bubble>
            );
        default:
            return null;
    }
}