// Inject the content script at popup load time.

const {
  KEY_API_SETTINGS,
} = require('../config.json');

const {
  extractObj,
  getFormInputs,
  getInputValue,
  getFormValues,
  setFormInputs,
  loadSettings
} = require('../utils.js');

const apiConfigBase = {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: "gpt-3.5-turbo",
    role: "user",
    temperature: 0.7
};// TODO: move hard-coded elements into config

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const initTranslateForm = () =>
{
    const form = document.getElementById("translate-form");

    loadSettings()
      .then((nameToValueMap) => setFormInputs(form, nameToValueMap));
};// end initTranslateForm

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
window.addEventListener("load", initTranslateForm);
