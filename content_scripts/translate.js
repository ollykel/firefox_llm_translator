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

    const makeElemVisitor = (element) =>
    {
        const   TEXT_NODE_TYPE  = 3;

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
                const elemId = getElementUID(element);
                const id = `text:${elemId}:${i}`;

                textNodes.push({
                    "getUniqueID": () => id,
                    "getText": () => ("" + currNode.textContent),
                    "setText": (newText) => { currNode.textContent = newText; }
                });
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
                    const text = textNode.getText();

                    if (!isOnlyWhitespace(text))
                    {
                        textTable[id] = text;
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

    const queryAPI = ({ promptStr, apiConfig }) =>
    {
        console.log(`promptStr: ${promptStr}`);// TODO: remove debug
        console.log(`promptStr length: ${promptStr.length}`);// TODO: remove debug
        console.log(`promptStr approx word count: ${promptStr.split(/\s*/).length}`);// TODO: remove debug
        // TODO: implement non-stub
        const body = {
            "text0000": "Foobar",
            "text0001": "Killroy was here"
        };

        return {
            "hasError": () => false,// TODO: implement non-stub
            "getError": () => "",// TODO: implement non-stub
            "getBody": () => ({ ...body })
        };
    };// end queryAPI
    
    const queryLLM = ({ textTable, targetLanguage, apiConfig, promptStr }) =>
    {
        const response = queryAPI({ promptStr, apiConfig });

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

                textNode.setText(newText);
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

    browser.runtime.onMessage.addListener((message) =>
    {
      if (message.command === 'translatePage')
      {
        translatePage(message.parameters);
      }
    });
}
)();
