// Inject the content script at popup load time.

const KEY_API_SETTINGS = 'apiSettings';

const apiConfigBase = {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: "gpt-3.5-turbo",
    role: "user",
    temperature: 0.7
};// TODO: move hard-coded elements into config

const extractObj = (obj, ...fields) =>
{
    let currObj = obj;

    for (const field of fields)
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

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const getFormInputs = (form) =>
{
    const out = [];

    for (const elem of form.elements)
    {
        if (elem.nodeName === 'INPUT')
        {
            out.push(elem);
        }
    }// end for (const elem of form.elements)
    
    return out;
};// end getFormInputs

const getInputValue = (input) =>
{
    switch (input.type)
    {
        case 'button':
        case 'submit':
        case 'reset':
            return null;
        case 'checkbox':
            if (input.checked)
            {
                return [input.name, [input.value]];
            } else {
                return null;
            }
        case 'radio':
            if (input.checked)
            {
                return [input.name, input.value];
            } else {
                return null;
            }
        case 'color':
            return [input.name, input.value];
        case 'date':
            return [input.name, new Date(input.value)];
        case 'datetime-local':
            return [input.name, new Date(input.value)];
        case 'email':
            return [input.name, input.value];
        case 'file':
            return [input.name, input.files];
        case 'hidden':
            return [input.name, input.value];
        case 'image':
            return [input.name, input.src];
        case 'month':
            return [input.name, new Date(input.value)];
        case 'number':
            return [input.name, Number(input.value)];
        case 'password':
            return [input.name, input.value];
        case 'range':
            return [input.name, Number(input.value)];
        case 'search':
            return [input.name, input.value];
        case 'tel':
            return [input.name, input.value];
        case 'text':
            return [input.name, input.value];
        case 'time':
            return [input.name, new Date(input.value)];
        case 'url':
            return [input.name, input.value];
        case 'week':
            return [input.name, new Date(input.value)];
        default:
            return null;
    }
};// end getInputValue

const getFormValues = (form) =>
{
    const inputs = getFormInputs(form);
    const nameValuePairs = inputs
        .map(getInputValue)
        .reduce((accum, kv) =>
        {
            if (kv !== null)
            {
                const [name, val] = kv;

                if (name in accum)
                {
                    accum[name].push(...val);
                }
                else
                {
                    accum[name] = val;
                }
            }

            return accum;
        },
        {}
    );

    return nameValuePairs;
};// end getFormValues
;// end getFormValues

const setFormInputs = (form, nameToValueMap) =>
{
    const inputs = getFormInputs(form);

    for (const input of inputs)
    {
        const name = input.name;

        if (name in nameToValueMap)
        {
            const val = nameToValueMap[name];

            if (input.type === 'checkbox')
            {
                input.checked = val.include(input.value);
            }
            else if (input.type === 'radio')
            {
                input.checked = (input.value === val);
            }
            else
            {
                input.value = val;
            }
        }
    }// end for (const input of inputs)
};// end setFormInputs

const loadSettings = () =>
{
    const form = document.getElementById("translate-form");

    browser.storage.sync.get(KEY_API_SETTINGS)
        .then(
            (nameToValueMap) =>
            {
                if (KEY_API_SETTINGS in nameToValueMap)
                {
                    setFormInputs(form, nameToValueMap[KEY_API_SETTINGS])
                }
            },
            logError
        );
};// end loadSettings

const addEventListeners = () =>
{
    const reportError = (err) =>
    {
        console.log(`error encountered while triggering translate page: ${err}`);
    };// end reportError
        
    document.getElementById('translate-form').addEventListener("submit", (e) =>
    {
        e.preventDefault();
        
        const form = e.target;
        const inputValues = getFormValues(form);
        const apiKey = inputValues['apiKey'];
        const targetLanguage = inputValues['target-language'];
        const characterLimit = Number(inputValues['character-limit']);
        
        const triggerTranslatePage = (tabs) =>
        {
            browser.tabs.sendMessage(tabs[0].id, {
              command: "translatePage",
              parameters: {
                  targetLanguage,
                  characterLimit,
                  apiConfig: { ...apiConfigBase, key: apiKey }
              }
            });
        };// end triggerTranslatePage
        
        browser.tabs
          .query({ active: true, currentWindow: true})
          .then(triggerTranslatePage)
          .catch(reportError);
    });

    document.getElementById('display-original-page').addEventListener('click', (ev) =>
    {
        const triggerMessage = (tabs) =>
        {
            browser.tabs.sendMessage(tabs[0].id, {
              command: "displayOriginalPage"
            });
        };// end triggerMessage

        browser.tabs
            .query({ active: true, currentWindow: true })
            .then(triggerMessage)
            .catch(reportError);
    });

    document.getElementById('display-translated-page').addEventListener('click', (ev) =>
    {
        const triggerMessage = (tabs) =>
        {
            browser.tabs.sendMessage(tabs[0].id, {
              command: "displayTranslatedPage"
            });
        };// end triggerMessage

        browser.tabs
            .query({ active: true, currentWindow: true })
            .then(triggerMessage)
            .catch(reportError);
    });
};// end addEventListeners

const notifyRequestProcessing = () =>
{
    const notifElem = document.getElementById('notif-request-processing');

    notifElem.style.setProperty('display', 'inline-block');
};// end notifyRequestProcessing

const notifyRequestProcessingFinished = () =>
{
    const notifElem = document.getElementById('notif-request-processing');

    notifElem.style.removeProperty('display');
};// end notifyRequestProcessingFinished

const reportExecuteScriptError = (error) =>
{
    console.log(`Translate popup script failed: ${error}`);
};// end reportExecuteScriptError

// insert content script
const injectScript = (tabs) =>
{
    browser.scripting
      .executeScript({
          target: { tabId: tabs[0].id },
          files: ["/content_scripts/translate.js"]
      })
      .then(addEventListeners)
      .catch(reportExecuteScriptError);
};// end injectScript

browser.tabs
    .query({ active: true, currentWindow: true })
    .then(injectScript)
    .catch(reportExecuteScriptError);

browser.runtime.onMessage.addListener((message) =>
{
    if (message.command === 'notifyRequestProcessing')
    {
        notifyRequestProcessing();
    }
    else if (message.command === 'notifyRequestProcessingFinished')
    {
        notifyRequestProcessingFinished();
    }
});

// load settings
window.addEventListener("load", loadSettings);
