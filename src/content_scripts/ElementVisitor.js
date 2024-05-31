const   ELEMENT_UID_ATTR_NAME   = 'llm_autotranslate_uid';

let elementUIDCount = 0;
const uidToVisitorMap = {};

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

        const ridToAttrMap = {};
        let ridCount = 0;
        let translatedContent = "" + element.innerHTML;

        const getElemRID = (elem) =>
        {
            const id = `${ridCount}`;

            ++ridCount;

            return id;
        };// end getElemRID

        const getElementAttrMap = (elem) =>
        {
            const out = {};

            for (const attr of elem.attributes)
            {
                const key = attr.name;
                const val = attr.value;

                out[key] = val;
            }// end for (const attr of elem.attributes)

            return out;
        };// end getElementAttrMap

        const replaceElementAttrs = (elem, attrMap) =>
        {
            const attrsToSet = { ...attrMap };

            for (const attr of elem.attributes)
            {
                const key = attr.name;

                if (key in attrMap)
                {
                    elem.setAttribute(key, attrMap[key]);

                    delete attrsToSet[key];
                }
                else
                {
                    elem.removeAttribute(key);
                }
            }// end for (const attr of elem.attributes)

            for (const [key, val] of Object.entries(attrsToSet))
            {
                elem.setAttribute(key, val);
            }// end for (const [key, val] of Object.entries(attrsToSet))
        };// end replaceElementAttrs

        const getChildren = () =>
        {
            const out = [];

            for (const child of element.children)
            {
                out.push(getElementVisitor(child));
            }// end for (const child of element.chlidren)

            return out;
        };// end getChildren

        const getMinimizedContent = () =>
        {
            // each handler function should return a string

            const handleTerminalDefault = (elem) =>
            {
                const rid = getElemRID(elem);
                
                return `<${elem.tagName} rid="${rid}" />`;
            };// end handleTerminalDefault

            const handleIgnore = (elem) => "";

            const elemHandlers = Object.freeze({
                img: handleTerminalDefault,// TODO: write special handler for alt
                hr: handleTerminalDefault,
                br: handleTerminalDefault,
                script: handleIgnore
            });

            const handleDefault = (elem) =>
            {
                const components = [];

                for (const node of elem.childNodes)
                {
                    switch (node.nodeType)
                    {
                        case 1:// element
                            // dispatch based on node name
                            const elemType = node.tagName;
                            const handleElem = (elemType in elemHandlers) ?
                                elemHandlers[elemType]
                                : handleDefault;

                            components.push(handleElem(node));
                            if (elemType in elemHandlers)
                            {
                                const handleElem = elemHandlers[elemType];

                                components.push(handleElem(node));
                            }
                            else
                            {
                                const rid = getElemRID(elem);
                                const openTag = `<${elem.tagName} rid="${rid}">`;
                                const closeTag = `</${elem.tagName}>`;

                                components.push([openTag, handleDefault(node), closeTag].join(''));
                            }
                            break;
                        case 3:// text
                            components.push(node.textContent);
                            break;
                        default:
                            // ignore all other types of nodes
                    }// end switch (node.nodeType)
                }// end for (const node of elem.childNodes)

                return components.join('');
            };// end handleDefault

            return handleDefault(element);
        };// end getMinimizedContent
        
        const origContentMinimized = getMinimizedContent(element);

        const visitor = Object.freeze({
            getUID: () => uid,
            getTagName: () => tagName,
            getChildren,
            getMinimizedContent,
            getOrigContent: () => origContent,
            getTranslatedContent: () => translatedContent,
            setTranslatedContent: (newContent) => { translatedContent = newContent; },
            displayOrig: () => { element.innerHTML = origContent; },
            displayTranslated: () => { element.innerHTML = translatedContent; }
        });

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

module.exports = {
    getElementVisitor,
    getElementVisitorByUID,
    getVisitedElementVisitors
};
