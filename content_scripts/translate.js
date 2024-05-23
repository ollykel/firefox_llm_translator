// content.js
//
// Provides in-page functions for traversing DOM tree and replacing text nodes
// with translated text provided by an API call to an LLM.

(() =>
{
    // Global guard variable, to prevent multiple executions.
    if (window.hasRun)
    {
        return;
    }

    window.hasRun = true;

    // === GLOBAL CONSTANTS ====================================================
    //
    // =========================================================================
    const   MAX_BATCH_CHAR_COUNT        = 2000;
    
    // New pipeline:
    //  1. Recursively identify all target elements
    //  2. Aggregate target elements into batches that match per-request
    //  character count
    //  3. Concurrently, for each element batch:
    //      a. Request translation table from api
    //      b. Upon receiving response:
    //          1. If error, alert user
    //          2. If valid, translate each element
    //  4. Upon completion of all (3), alert user that translation is finished.

    // === Utility Functions ===================================================
    //
    // =========================================================================
    const logError = (errMsg) =>
    {
        console.log(errMsg);// TODO: consider more advanced error logging
        alert(`Error: ${errMsg}`);
    };// end const logError = (errMsg) =>

    const extractObj = (obj, ...fields) =>
    {
        let currObj = obj;

        for (let field of fields)
        {
            if (currObj.hasOwnProperty(field))
            {
                currObj = currObj[field];
            }
            else
            {
                return null;
            }
        }// end for (let field of fields)

        return currObj;
    };// end extractObj

    const mergeObj = (orig, ...toMerge) =>
    {
        for (const obj of toMerge)
        {
            for (const [k, v] of Object.entries(obj))
            {
                orig[k] = v;
            }// end for (const [k, v] of Object.values(obj))
        }// end for (const obj of toMerge)

        return orig;
    };// end mergeObj

    const isOnlyWhitespace = (str) => str.trim().length === 0;

    const notifyRequestProcessing = () =>
    {
        browser.runtime.sendMessage({ command: "notifyRequestProcessing", });
    };// end notifyRequestProcessing

    const notifyRequestProcessingFinished = () =>
    {
        browser.runtime.sendMessage({ command: "notifyRequestProcessingFinished" });
    };// end notifyRequestProcessingFinished

    const {
        getElementUID,
        getElementByUID,
        getElementVisitor,
        getElementVisitorByUID,
        getVisitedElementVisitors
    } = (() => {
        const   ELEMENT_UID_ATTR_NAME   = 'llm_autotranslate_uid';

        let elementUIDCount = 0;
        let elemUIDMap = {};
        let uidToVisitorMap = {};

        const getElementUID = (element) =>
        {
            if (element.hasAttribute(ELEMENT_UID_ATTR_NAME))
            {
                return element.getAttribute(ELEMENT_UID_ATTR_NAME);
            }
            else
            {
                const uid = `element${elementUIDCount}`;

                elemUIDMap[uid] = element;
                element.setAttribute(ELEMENT_UID_ATTR_NAME, uid);
                ++elementUIDCount;

                return uid;
            }
        };// end getElementUID

        const getElementByUID = (uid) =>
        {
            return elemUIDMap[uid];
        };// end getElementByUID

        const getElementVisitor = (element) =>
        {
            const uid = getElementUID(element);

            if (uid in uidToVisitorMap)
            {
                return uidToVisitorMap[uid];
            }
            else
            {
                const tagName = element.tagName().toLowerCase();
                const origContent = element.innerHTML;

                let translatedContent = element.innerHTML;

                const getChildren = () =>
                {
                    let out = [];

                    for (const child of element.chlidren)
                    {
                        out.push(getElementVisitor(child));
                    }// end for (const child of element.chlidren)

                    return out;
                };// end getChildren

                const visitor = {
                    "getUID": () => uid,
                    "getTagName": () => tagName,
                    getChildren,
                    "getOrigContent": () => origContent,
                    "getTranslatedContent": () => translatedText,
                    "setTranslatedContent": (newContent) => { translatedContent = newContent; },
                    "displayOrig": () => { element.innerHTML = origContent; },
                    "displayTranslated": () => { element.innerHTML = translatedContent; }
                };

                uidToVisitorMap[uid] = visitor;

                return visitor;
            }
        };// end getElementVisitor

        const getElementVisitorByUID = (uid) =>
        {
            return uidToVisitorMap[uid];
        };// end getElementVisitorByUID

        const getVisitedElementVisitors = () =>
        {
            return Object.values(uidToVisitorMap);
        };// end getVisitedElementVisitors

        return
        {
            getElementUID,
            getElementByUID,
            getElementVisitor,
            getElementVisitorByUID,
            getVisitedElementVisitors
        };
    })();

    // format: { NODE_ID: { translatedText: <str>, origText: <str> }}
    let TEXT_NODE_WRAPPERS = {};

    const makeElemVisitor = (element) =>
    {
        const   TEXT_NODE_TYPE  = 3;

        const getTextNodeWrapper = (elem, index, textNode) =>
        {
            const elemId = getElementUID(elem);
            const uid = `text:${elemId}:${index}`;

            if (uid in TEXT_NODE_WRAPPERS)
            {
                return TEXT_NODE_WRAPPERS[uid];
            }
            else
            {
                // init origText and translatedText both to original text content
                const origText = ("" + textNode.textContent);
                let translatedText = ("" + textNode.textContent);

                const newWrapper = {
                    "getUniqueID": () => uid,
                    "getOrigText": () => origText,
                    "getTranslatedText": () => translatedText,
                    "setTranslatedText": (newText) => { translatedText = newText; },
                    "displayTranslated": () => { textNode.textContent = translatedText; },
                    "displayOrig": () => { textNode.textContent = origText; }
                };

                TEXT_NODE_WRAPPERS[uid] = newWrapper;
                return newWrapper;
            }
        };// end getTextNodeWrapper

        let childNodes = [];
        let textNodes = [];

        for (let i = 0; i < element.children.length; ++i)
        {
            const currChild = element.children[i];

            childNodes.push(currChild);
        }// end for (let i = 0; i < element.children.length; ++i)

        for (let i = 0; i < element.childNodes.length; ++i)
        {
            const currNode = element.childNodes[i];
            if (currNode.nodeType === TEXT_NODE_TYPE)
            {
                textNodes.push(getTextNodeWrapper(element, i, currNode));
            }
        }// end for (let i = 0; i < element.childNodes.length; ++i)

        return {
            "getTextNodes": () => textNodes,
            "getElemNodes": () => childNodes
        };
    };// end makeElemVisitor

    const getTargetElemContentBatches = (() => {
        const TARGET_ELEMS_SET = {
            'p': true,
            'span': true,
            'a': true,
            'li': true,
            'table': true,
            'h1': true,
            'h2': true,
            'h3': true,
            'h4': true,
            'button': true,
            'label': true
        };// end TARGET_ELEMS_SET

        const collectTargetElemVisitors = (elementVisitor) =>
        {
            const elemTag = elementVisitor.getTagName();

            if (elemTag in TARGET_ELEMS_SET)
            {
                return [elementVisitor];
            }
            else
            {
                let out = [];

                for (const visitor of elemVisitor.getChildren())
                {
                    out.push(...collectTargetElemVisitors(visitor));
                }// end for (const elem of element.children)

                return out;
            }
        };// end collectTargetElemVisitors

        const makeElemContentBatches = (elementVisitors, batchCharCount) =>
        {
            let currBatch = {};
            let currCharCount = 0;
            let batches = [];

            for (const elemVisitor of elementVisitors)
            {
                const elemUID = elemVisitor.getUID();
                const elemContent = elemVisitor.getOrigContent();
                const nextCharCount = currCharCount + elemContent.length;

                if (nextCharCount > batchCharCount)
                {
                    batches.push(currBatch);
                    currBatch = {};
                    currBatch[elemUID] = elemContent;
                    currCharCount = elemContent.length;
                }
                else
                {
                    batch[elemUID] = elemContent;
                }
            }// end for (const elem of elements)

            if (currCharCount > 0)
            {
                batches.push(currBatch);
            }

            return batches;
        };// end makeElemContentBatches

        const getTargetElemContentBatches = ({ element, batchCharCount }) =>
        {
            const parentVisitor = getElementVisitor(element);
            const elemVisitorCollection = collectTargetElemVisitors(parentVisitor);

            return makeElemContentBatches(elemVisitorCollection, batchCharCount);
        };// end getTargetElemContentBatches

        return getTargetElemContentBatches;
    })();

    const applyTranslationTable = (translationTable) =>
    {
        for (const [elemUID, translatedContent] of Object.entries(translationTable))
        {
            const elemVisitor = getElementVisitorByUID(elemUID);

            if (elemVisitor !== null)
            {
                elemVisitor.setTranslatedContent(translatedContent);
                elemVisitor.displayTranslated();
            }
        }// end for (const [elemUID, translatedContent] of Object.entries(translationTable))
    };// end applyTranslationTable

    const translateElemContentBatches = (() => {
        const formatPrompt = ({ elemContentBatch, targetLanguage }) =>
        {
            const batchStr = JSON.stringify(elemContentBatch);

            return (
`Please translate the values in the json object provided below from whatever the
original language is into the following language: ${targetLanguage}.

Each of the values is the content of an html element, which may or not contain
nested html elements.  Return the response as a json object which maps each key
in the original json object to the corresponding translation, with the context
of neighboring values taken into account. Please do not modify the attributes of
html tags.

Requirements:
    - Any html anchors encountered need to be replicated in the translation,
    with the new hyperlink enclosing a stretch of text equivalent to the text
    enclosed by the original hyperlink.
    - Any whitespace and other non-lexical characters a the beginning and ending
    of every content string must be preserved in the translated content string.

"""
${batchStr}
"""`);// TODO: implement non-stub
        };// end formatPrompt

        const handleAPIResponse = (resp) =>
        {
            if (resp.hasError())
            {
                logError(resp.getError());
            }
            else
            {
                applyTranslationTable(resp.getBody());
            }
        };// end handleAPIResponse

        const translateElemContentBatches = async ({ elemContentBatches, apiConfig, targetLanguage }) =>
        {
            // concurrently query for translation tables, then translate
            // elements on dom tree

            const queryPromises = elemContentBatches.map((elemContentBatch) =>
            {
                const promptStr = formatPrompt({ elemContentBatch, targetLanguage });

                return queryAPIOpenAI({ promptStr, apiConfig }).then(handleAPIResponse);
            });

            for (const queryPromise of queryPromises)
            {
                await queryPromise;
            }// end for (const elemContentBatch of elemContentBatches)
        };// end translateElemContentBatches

        return translateElemContentBatches;
    })();

    // Partitions one single textTable (mapping of text node ids to text
    // content) into several textTables, each of which contains no more than
    // <batchCharCount> characters of text content.
    //
    // @input textTable (obj)       -- a mapping of text node ids to text content
    // @input batchCharCount (int)  -- maximum total characters of text content
    //                                  per output textTable
    // @input keepSingles (bool)    -- whether or not to drop single text nodes
    //                                 which exceed the batchCharCount on their
    //                                 own. If true, any such nodes will be put
    //                                 in their own textTable
    // @return -- an array of textTables
    const partitionTextTableByCharCount = ({ textTable, batchCharCount, keepSingles = false }) =>
    {
        let out = [];
        let currTable = {};
        let currCharCount = 0;

        for (const [key, val] of Object.entries(textTable))
        {
            if (currCharCount + val.length > batchCharCount)
            {
                if (currCharCount === 0)
                {
                    if (keepSingles)
                    {
                        currTable[key] = val;
                        out.push(currTable);
                        currTable = {};
                    }
                    // else: just ignore
                }
                else
                {
                    out.push(currTable);
                    currTable = {};
                    currTable[key] = val;
                    currCharCount = val.length;
                }
            }
            else
            {
                currTable[key] = val;
                currCharCount += val.length;
            }
        }// end for (const [key, val] of Object.values(textTable))

        if (currCharCount > 0)
        {
            out.push(currTable);
        }

        return out;
    };// end partitionTextTableByCharCount

    // consider children of all following elements for translation
    const ELEMS_TO_TRANSLATE_SET = {
        'p': true,
        'span': true,
        'a': true,
        'li': true,
        'table': true,
        'h1': true,
        'h2': true,
        'h3': true,
        'h4': true,
        'button': true,
        'label': true
    };// end ELEMS_TO_TRANSLATE_SET

    const generateTranslationTable = async ({ element, targetLanguage, characterLimit, apiConfig }) =>
    {
        const visitElem = (elem, shouldTranslate) =>
        {
            if (characterLimit < 1)
            {
                return {};
            }

            const elemVisitor = makeElemVisitor(elem);

            let textTable = {};

            if (shouldTranslate)
            {
                for (let textNode of elemVisitor.getTextNodes())
                {
                    const id = textNode.getUniqueID();
                    const origText = textNode.getOrigText();

                    if (!isOnlyWhitespace(origText))
                    {
                        characterLimit -= origText.length;

                        if (characterLimit > 0)
                        {
                            textTable[id] = origText;
                        }
                        else
                        {
                            break;
                        }
                    }
                }// end for (let textNode of elemVisitor.getTextNodes())
            }

            for (let childNode of elemVisitor.getElemNodes())
            {
                if (characterLimit < 1)
                {
                    break;
                }

                const translateNext = shouldTranslate
                    || (childNode.nodeName.toLowerCase() in ELEMS_TO_TRANSLATE_SET);
                const subTable = visitElem(childNode, translateNext);

                textTable = { ...textTable, ...subTable };
            }// end for (let childNode of elemVisitor.getElemNodes())

            return textTable;
        };// end visitElem

        const textTable = visitElem(element, false);// don't translate until appropriate parent element visited
        const formatPrompt = ({ textTable, targetLanguage }) => 
`Please translate the json object provided below from whatever the original
language is into the following language: ${targetLanguage}.

Return the response as a json object which maps each key in the original json
object to the corresponding translation, with the context of neighboring values
taken into account.

Keep in mind that all of this text belongs to a single webpage. Try to translate
the text in a way that respects the original meaning and sentence-wise grammar
of the target language while still providing an adequate translation of each
individual unit of text, as many of these text nodes will be the anchor text of
hyperlinks.

Preserve the whitespace and extraneous characters of the original strings
whenever possible.

"""
${JSON.stringify(textTable)}
"""`;// TODO: implement non-stub
        const translationTable = await queryLLM({
            textTable, targetLanguage, apiConfig, formatPrompt
        });

        return translationTable;
    };// end generateTranslationTable

    const queryAPIStub = ({ promptStr, apiConfig }) =>
    {
        // TODO: implement non-stub
        const body = {
            "text:element1:0": "Foobar",
            "text:element10:0": "Killroy was here",
            "text:element100:0": "Foobar",
            "text:element1000:0": "Killroy was here",
            "text:element10000:0": "Foobar",
            "text:element100000:0": "Killroy was here",
            "text:element2:0": "Foobar",
            "text:element20:0": "Killroy was here",
            "text:element200:0": "Foobar",
            "text:element2000:0": "Killroy was here",
            "text:element20000:0": "Foobar",
            "text:element200000:0": "Killroy was here",
            "text:element3:0": "Foobar",
            "text:element30:0": "Killroy was here",
            "text:element300:0": "Foobar",
            "text:element3000:0": "Killroy was here",
            "text:element30000:0": "Foobar",
            "text:element300000:0": "Killroy was here"
        };

        return {
            "hasError": () => false,// TODO: implement non-stub
            "getError": () => "",// TODO: implement non-stub
            "getBody": () => ({ ...body })
        };
    };// end queryAPIStub

    const queryAPIOpenAI = async ({ promptStr, apiConfig }) =>
    {
        const { endpoint, key, model, role, temperature } = apiConfig;

        const requestData = {
            model,
            messages: [{ role, content: promptStr }],
            temperature
        };
        const requestStr = JSON.stringify(requestData);

        const request =
        {
            method: 'POST',
            mode: "cors",
            cache: "no-cache",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            redirect: "follow",
            body: requestStr
        };
        const response = await fetch(endpoint, request);

        let error = null;
        let errorFlag = false;
        let body = {};

        const respBody = await response.json();
        const respData = extractObj(respBody, 'choices', 0);

        if (respData === null)
        {
            error = "could not parse api response";
            errorFlag = true;
        }
        else
        {
            const finishReason = (respData['finish_reason'] || 'none_given').toLowerCase();

            if (finishReason !== 'stop')
            {
                error = `reason given for stopping: "${finishReason}"`;
                errorFlag = true;
            }
            else
            {
                const contentText = extractObj(respData, 'message', 'content');

                if (contentText === null)
                {
                    error = 'content could not be extracted from api response';
                    errorFlag = true;
                }
                else
                {
                    try
                    {
                        body = JSON.parse(contentText);
                    }
                    catch (err)
                    {
                        error = `error parsing response content: ${err}`;
                        hasError = true;
                    }
                }
            }
        }

        return {
            "hasError": () => errorFlag,
            "getError": () => error,
            "getBody": () => ({ ...body })
        };
    };// end queryAPIOpenAI
    
    // Handles querying the LLM of choice (currently only OpenAI) for the
    // translations of text nodes. May break request into multiple sub-requests
    // to account for character limit.
    //
    // Performs any necessary error handling with side effects (i.e. notifying
    // user) if the api request is unsuccessful.
    //
    // @input textTable (obj)
    //      -- all text nodes to translate, with their unique IDs
    // @input targetLanguage (str)
    //      -- language to request translation into
    // @input apiConfig (obj)
    //      -- configuration settings for api request
    // @input formatPrompt (func({ textTable, targetLanguage }) -> str)
    //      -- function which generates a prompt to send to LLM's api
    // 
    // @return (Promise of) translation table, if successful; empty object
    // otherwise
    const queryLLM = async ({ textTable, targetLanguage, apiConfig, formatPrompt }) =>
    {
        let translationTable = {};

        notifyRequestProcessing();

        try
        {
            // break up textTable into several sub-tables, make separate request
            // for each one
            const subTextTables = partitionTextTableByCharCount({
                textTable,
                batchCharCount: MAX_BATCH_CHAR_COUNT,
                keepSingles: true
            });

            // TODO: consider adding waits between creating new requests
            const responsePromises = subTextTables.map((table) => {
                const promptStr = formatPrompt({ textTable: table, targetLanguage });

                return queryAPIOpenAI({ promptStr, apiConfig });
            });

            for (const responsePromise of responsePromises)
            {
                const response = await responsePromise;

                if (response.hasError())
                {
                    logError(response.getError());
                }
                else
                {
                    translationTable = mergeObj(translationTable, response.getBody());
                }
            }// end for (const responsePromise of responsePromises)
        }
        finally
        {
            notifyRequestProcessingFinished();
            return translationTable;
        }
    };// end queryLLM

    const translateElement = async ({ element, targetLanguage, characterLimit, apiConfig }) =>
    {
        const translationTable = await generateTranslationTable({
          element, targetLanguage, characterLimit, apiConfig
        });

        const visitElem = (elem) =>
        {
            const elemVisitor = makeElemVisitor(elem);

            for (const textNode of elemVisitor.getTextNodes())
            {
                const id = textNode.getUniqueID();

                if (id in translationTable)
                {
                  const newText = translationTable[id];

                  textNode.setTranslatedText(newText);
                  textNode.displayTranslated();
                }
            }// end for (const textNode of elemVisitor.getTextNodes())

            for (const elem of elemVisitor.getElemNodes())
            {
                visitElem(elem);
            }// end for (const elem of elemVisitor.getElemNodes())
        };// end visitElem

        visitElem(element);
    };// end translateElement
    
    const translatePage = ({ targetLanguage, characterLimit, apiConfig }) =>
    {
        translateElement({
            element: document.body,
            targetLanguage,
            characterLimit,
            apiConfig
        });
    };// end translateDocument

    const displayOriginalPage = () =>
    {
        const visitElem = (elem) =>
        {
            const visitor = makeElemVisitor(elem);

            for (const textNode of visitor.getTextNodes())
            {
                textNode.displayOrig();
            }// end for (const textNode of visitor.getTextNodes())

            for (const child of visitor.getElemNodes())
            {
                visitElem(child);
            }// end for (const child of visitor.getElemNodes())
        };// end visitElem

        visitElem(document.body);
    };// end displayOriginalPage

    const displayTranslatedPage = () =>
    {
        const visitElem = (elem) =>
        {
            const visitor = makeElemVisitor(elem);

            for (const textNode of visitor.getTextNodes())
            {
                textNode.displayTranslated();
            }// end for (const textNode of visitor.getTextNodes())

            for (const child of visitor.getElemNodes())
            {
                visitElem(child);
            }// end for (const child of visitor.getElemNodes())
        };// end visitElem

        visitElem(document.body);
    };// end displayTranslatedPage

    browser.runtime.onMessage.addListener((message) =>
    {
        if (message.command === 'translatePage')
        {
          translatePage(message.parameters);
        }
        else if (message.command === 'displayOriginalPage')
        {
            displayOriginalPage();
        }
        else if (message.command === 'displayTranslatedPage')
        {
            displayTranslatedPage();
        }
    });
}
)();
