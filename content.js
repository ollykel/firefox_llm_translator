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

    const formatJSON = (obj) =>
    {
        const formattedEntries = Object.entries(obj).map(([k, v]) => `${k}: ${v}`);

        return `{${formattedEntries.join(", ")}}`;
    };// end formatJSON

    const makeElemVisitor = (element) =>
    {
        const   TEXT_NODE_TYPE  = 3;

        const childNodes = element.children;
        const textNodes = element.childNodes
            .filter((node) => node.nodeType === TEXT_NODE_TYPE)
            .map((textNode) => ({
                "getUniqueID": () => "text0000",// TODO: implement non-stub
                "getText": () => textNode.textContent
        }));

        return ({
            "getTextNodes": () => textNodes,
            "getElemNodes": () => childNodes
        });
    };// end makeElemVisitor

    const generateTranslationTable = ({ element, targetLanguage }) =>
    {
        const visitElem = (elem) =>
        {
            const elemVisitor = makeElemVisitor(elem);

            let textTable = ({});

            for (let textNode of elemVisitor.getTextNodes())
            {
                const id = textNode.getUniqueID();

                textTable[id] = textNode.getText();
            }// end for (let textNode of elemVisitor.getTextNodes())

            for (let childNode of elemVisitor.getElemNodes())
            {
                const subTable = visitElem(childNode);

                textTable = ({ ...textTable, ...subTable });
            }// end for (let childNode of elemVisitor.getElemNodes())

            return textTable;
        };// end visitElem

        const textTable = visitElem(element);
        const formatPrompt = ({ textTable, targetLanguage }) => 
`Please translate the json object provided below into the following language: ${targetLanguage}.
Return the response as a json object which maps each key in the original json object to the corresponding translation.

"""
${formatJSON(textTable)}
"""`;// TODO: implement non-stub
        const translationTable = queryLLM({
            textTable, targetLanguage, apiEndpoint, apiKey, formatPrompt
        });

        return translationTable;
    };// end generateTranslationTable

    const queryAPI = ({ promptStr, apiEndpoint, apiKey }) =>
    {
        // TODO: implement non-stub
        const body = ({
            "text0000": "Foobar",
            "text0001": "Killroy was here"
        });

        return ({
            "hasError": () => false,// TODO: implement non-stub
            "getError": () => "",// TODO: implement non-stub
            "getBody": () => ({ ...body })
        });
    };// end queryAPI
    
    const queryLLM = ({ textTable, targetLanguage, apiEndpoint, apiKey, formatPrompt }) =>
    {
        const promptStr = formatPrompt({ textTable, targetLanguage });
        const response = queryAPI({ promptStr, apiEndpoint, apiKey });

        if (response.hasError())
        {
            logError(response.getError());
            return ({});
        }
        else
        {
            return response.getBody();
        }
    };// end queryLLM
}
)();
