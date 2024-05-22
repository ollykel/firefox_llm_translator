// Inject the content script at popup load time.

const apiConfigBase = {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: "gpt-3.5-turbo",
    role: "user",
    temperature: 0.7
};// TODO: move hard-coded elements into config

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

const getFormValues = (form) =>
{
    const inputs = form.elements;
    let output = {};

    for (let i = 0; i < inputs.length; ++i)
    {
        const currInput = inputs[i];

        if (currInput.nodeName === 'INPUT')
        {
            const inputName = currInput.name;
            const inputValue = currInput.value;
            
            output[inputName] = inputValue;
        }
    }// end for (let i = 0; i < inputs.length; ++i)
    
    return output;
};// end getFormValues

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
        const apiKey = inputValues['api-key'];
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

    console.log(`notifElem: ${notifElem}`);// TODO: remove debug
    console.log(`notifElem style: ${notifElem.style.cssText}`);// TODO: remove debug
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
