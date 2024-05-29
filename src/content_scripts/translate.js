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
        alert('Translation finished.');
    };// end notifyRequestProcessingFinished

    const {
        getElementVisitor,
        getElementVisitorByUID,
        getVisitedElementVisitors
    } = (() => {
        const   ELEMENT_UID_ATTR_NAME   = 'llm_autotranslate_uid';

        let elementUIDCount = 0;
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

                element.setAttribute(ELEMENT_UID_ATTR_NAME, uid);
                ++elementUIDCount;

                return uid;
            }
        };// end getElementUID

        const getElementVisitor = (element) =>
        {
            const uid = getElementUID(element);

            if (uid in uidToVisitorMap)
            {
                return uidToVisitorMap[uid];
            }
            else
            {
                const tagName = element.tagName.toLowerCase();
                const origContent = "" + element.innerHTML;

                let translatedContent = "" + element.innerHTML;

                const getChildren = () =>
                {
                    let out = [];

                    for (const child of element.children)
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

        return {
            getElementVisitor,
            getElementVisitorByUID,
            getVisitedElementVisitors
        };
    })();

    const getTargetElemContentBatches = (() => {
        const TARGET_ELEMS_SET = {
            'p': true,
            'span': true,
            'a': true,
            'li': true,
            'td': true,
            'th': true,
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

                for (const visitor of elementVisitor.getChildren())
                {
                    out.push(...collectTargetElemVisitors(visitor));
                }// end for (const elem of element.children)

                return out;
            }
        };// end collectTargetElemVisitors

        const makeElemContentBatches = (elementVisitors, batchCharCount, maxCharCount) =>
        {
            let currBatch = {};
            let currCharCount = 0;
            let batches = [];

            for (const elemVisitor of elementVisitors)
            {
                const elemUID = elemVisitor.getUID();
                const elemContent = elemVisitor.getOrigContent();
                const nextCharCount = currCharCount + elemContent.length;

                maxCharCount -= elemContent.length;

                if (maxCharCount < 0)
                {
                    break;
                }

                if (nextCharCount > batchCharCount)
                {
                    batches.push(currBatch);
                    currBatch = {};
                    currBatch[elemUID] = elemContent;
                    currCharCount = elemContent.length;
                }
                else
                {
                    currBatch[elemUID] = elemContent;
                    currCharCount = nextCharCount;
                }
            }// end for (const elem of elements)

            if (currCharCount > 0)
            {
                batches.push(currBatch);
            }

            return batches;
        };// end makeElemContentBatches

        const getTargetElemContentBatches = ({ element, batchCharCount, maxCharCount }) =>
        {
            const parentVisitor = getElementVisitor(element);
            const elemVisitorCollection = collectTargetElemVisitors(parentVisitor);

            return makeElemContentBatches(elemVisitorCollection, batchCharCount, maxCharCount);
        };// end getTargetElemContentBatches

        return getTargetElemContentBatches;
    })();

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
    - Any href and src attributes encountered in html tags need to be reproduced
    as-is; they should NOT be translated.
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
    
    const translateElement = async ({ element, targetLanguage, characterLimit, apiConfig }) =>
    {
        const elemContentBatches = getTargetElemContentBatches({
            element,
            batchCharCount: MAX_BATCH_CHAR_COUNT,
            maxCharCount: characterLimit
        });

        notifyRequestProcessing();
        await translateElemContentBatches({
            elemContentBatches,
            apiConfig,
            targetLanguage
        });
        notifyRequestProcessingFinished();
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
        for (const elemVisitor of getVisitedElementVisitors())
        {
            elemVisitor.displayOrig();
        }// end for (const elemVisitor of getVisitedElementVisitors())
    };// end displayOriginalPage

    const displayTranslatedPage = () =>
    {
        for (const elemVisitor of getVisitedElementVisitors())
        {
            elemVisitor.displayTranslated();
        }// end for (const elemVisitor of getVisitedElementVisitors())
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