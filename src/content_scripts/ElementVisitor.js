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

        let translatedContent = "" + element.innerHTML;

        const getChildren = () =>
        {
            const out = [];

            for (const child of element.children)
            {
                out.push(getElementVisitor(child));
            }// end for (const child of element.chlidren)

            return out;
        };// end getChildren

        const visitor = Object.freeze({
            getUID: () => uid,
            getTagName: () => tagName,
            getChildren,
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
