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

    // Functions:
    //  - translateElement(element, targetLanguage)
    //      - generate a translationTable into the targetLanguage
    //      - visit all children of the element recursively; for each text node:
    //          - find text node's unique id
    //          - if unique id found in translationTable, translate text node
    //  - generateTranslationTable(element, targetLanguage) -> Translation Table (dict):
    //      - init textMap: an empty map of text node ids to text strings
    //      - recursively visit all children of the element; for each text node:
    //          - generate a unique id
    //          - add <id : text> pair to textMap
    //      - generate a prompt for the LLM, consisting of:
    //          - a prologue explaining the desired outcome (a json object
    //          mapping the unique ids in textMap to the equivalent translations
    //          in <targetLanguage>)
    //          - the textMap, formatted appropriately
    //      - send the prompt to the LLM API, utilizing:
    //          - an API key
    //          - the API endpoint url
    //      - if API query resolved correctly:
    //          - retrieve translationMap from the response
    //          - return translationMap
    //      - else:
    //          - throw an exception explaining that the query could not be made
    //  - replaceTextNode(origNode, translationTable) -> new text node with
    //  translated text
    //      - find unique identifier for origNode
    //      - if unique identifier found:
    //          - create a dom node that consists of:
    //              - a wrapper node that identifies the node as a translation node
    //              - inner text containing the text
    //          - replace <origNode> with new dom node
    //      - else:
    //          - return <origNode>
    //  - queryLLM(textTable<text id : origText>, targetLanguage, API endpoint, API key, formatPrompt):
    //      -> translationTable<text id : translatedText>

    const logError = (errMsg) =>
    {
        console.log(errMsg);// TODO: consider more advanced error logging
    };// end const logError = (errMsg) =>

    const isOnlyWhitespace = (str) => str.trim().length === 0;

    let __GET_ELEMENT_UID_COUNT = 0;
    const getElementUID = (element) =>
    {
        const   ELEMENT_UID_ATTR_NAME   = 'llm_autotranslate_uid';

        if (element.hasAttribute(ELEMENT_UID_ATTR_NAME))
        {
            return element.getAttribute(ELEMENT_UID_ATTR_NAME);
        }
        else
        {
            const out = `element${__GET_ELEMENT_UID_COUNT}`;

            element.setAttribute(ELEMENT_UID_ATTR_NAME, out);
            ++__GET_ELEMENT_UID_COUNT;
            return out;
        }
    };// end getElementUID

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

    // consider children of all following elements for translation
    const ELEMS_TO_TRANSLATE_SET = {
        'p': true,
        'table': true,
        'h1': true,
        'h2': true,
        'h3': true,
        'h4': true
    };// end ELEMS_TO_TRANSLATE_SET

    const generateTranslationTable = ({ element, targetLanguage, apiConfig }) =>
    {
        const visitElem = (elem, shouldTranslate) =>
        {
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
                        textTable[id] = origText;
                    }
                }// end for (let textNode of elemVisitor.getTextNodes())
            }

            for (let childNode of elemVisitor.getElemNodes())
            {
                const translateNext = shouldTranslate
                    || (childNode.nodeName.toLowerCase() in ELEMS_TO_TRANSLATE_SET);
                const subTable = visitElem(childNode, translateNext);

                textTable = { ...textTable, ...subTable };
            }// end for (let childNode of elemVisitor.getElemNodes())

            return textTable;
        };// end visitElem

        const textTable = visitElem(element, false);// don't translate until appropriate parent element visited
        const promptStr =
`Please translate the json object provided below into the following language: ${targetLanguage}.

Return the response as a json object which maps each key in the original json object to the corresponding translation.
Keep in mind that all of this text belongs to a single webpage. Try to translate the text in a way that respects the
sentence-wise grammar of the target language while still providing an adequate translation of each individual
unit of text, as many of these text nodes will be the anchor text of hyperlinks.

"""
${JSON.stringify(textTable)}
"""`;// TODO: implement non-stub
        const translationTable = queryLLM({
            textTable, targetLanguage, apiConfig, promptStr
        });

        return translationTable;
    };// end generateTranslationTable

    const queryAPIStub = ({ promptStr, apiConfig }) =>
    {
        console.log(`promptStr: ${promptStr}`);// TODO: remove debug
        console.log(`promptStr length: ${promptStr.length}`);// TODO: remove debug
        console.log(`promptStr approx word count: ${promptStr.split(/\s*/).length}`);// TODO: remove debug
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
    
    const queryLLM = ({ textTable, targetLanguage, apiConfig, promptStr }) =>
    {
        const response = queryAPIStub({ promptStr, apiConfig });

        if (response.hasError())
        {
            logError(response.getError());
            return {};
        }
        else
        {
            return response.getBody();
        }
    };// end queryLLM

    const translateElement = ({ element, targetLanguage, apiConfig }) =>
    {
        const translationTable = generateTranslationTable({
          element, targetLanguage, apiConfig
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
    
    const translatePage = ({ targetLanguage, apiConfig }) =>
    {
        translateElement({
            element: document.body,
            targetLanguage,
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
