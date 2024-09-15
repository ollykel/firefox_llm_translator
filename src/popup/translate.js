// Inject the content script at popup load time.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

const {
    KEY_API_SETTINGS,
    API_ENDPOINT
} = require('../config.json');

const {
  extractObj,
  getFormInputs,
  getInputValue,
  getFormValues,
  setFormInputs,
  loadSettings
} = require('../utils.js');

import TranslateForm from './TranslateForm';

import store from '../store';
import {
  translatorMutator,
  pageStateMutator
} from '../store';

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const reportError = (err) =>
{
    console.log(`error encountered while triggering translate page: ${err}`);
};// end reportError

const handleSubmitTranslateForm = async (values) =>
{
    const defaultSettings = await loadSettings();
    const { targetLanguage, characterLimit, apiKey, temperature } = values;
    
    const triggerTranslatePage = (tabs) =>
    {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "translatePage",
          parameters: {
              targetLanguage,
              characterLimit,
              apiConfig: {
                  ...defaultSettings,
                  endpoint: API_ENDPOINT,
                  temperature: temperature,
                  key: apiKey
              }
          }
        });
    };// end triggerTranslatePage
    
    browser.tabs
      .query({ active: true, currentWindow: true})
      .then(triggerTranslatePage)
      .catch(reportError);
};// end handleSubmitTranslateForm

const initPage = async () =>
{
  const el = document.getElementById('root');
  const root = ReactDOM.createRoot(el);
  const defaultSettings = await loadSettings();

  root.render(
    <Provider store={store}>
      <div id="translate-page">
        <h1>Translate LLM</h1>
        <TranslateForm
          defaultValues={defaultSettings}
          onSubmit={handleSubmitTranslateForm}
        />
      </div>
    </Provider>
  );
};// end initPage

const addEventListeners = () =>
{
    const reportError = (err) =>
    {
        console.log(`error encountered while triggering translate page: ${err}`);
    };// end reportError
        
    document.getElementById('translate-form').addEventListener("submit", async (e) =>
    {
        e.preventDefault();
        
        const form = e.target;
        const settings = await loadSettings();
        const formValues = getFormValues(form);
        const apiKey = formValues['apiKey'];
        const targetLanguage = formValues['target-language'];
        const characterLimit = Number(formValues['characterLimit']);
        
        const triggerTranslatePage = (tabs) =>
        {
            browser.tabs.sendMessage(tabs[0].id, {
              command: "translatePage",
              parameters: {
                  targetLanguage,
                  characterLimit,
                  apiConfig: {
                      ...settings,
                      endpoint: API_ENDPOINT,
                      key: apiKey
                  }
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
window.addEventListener("load", initPage);
