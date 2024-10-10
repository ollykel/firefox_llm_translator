// Inject the content script at popup load time.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch, useSelector } from 'react-redux';

import '../master.css';

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
  pageStateMutator,
  pageStates
} from '../store';

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const reportError = (err) =>
{
    console.log(`error encountered while triggering translate page: ${err}`);
};// end reportError

const requestState = (tabs) =>
{
  browser.tabs.sendMessage(tabs[0].id, {
    command: 'requestState'
  });
};// end requestState

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

const handleViewOriginal = async () =>
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
};// end handleViewOriginal

const handleViewTranslation = async () =>
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
};// end handleViewTranslation

const Popup = () =>
{
  const pageState = useSelector((state) => state.pageState);
  const pageStatePanel = (() =>
  {
    const handleClickViewOriginal = async (ev) =>
    {
      ev.preventDefault();

      handleViewOriginal();
    };// end handleClickViewOriginal

    const handleClickViewTranslation = async (ev) =>
    {
      ev.preventDefault();

      handleViewTranslation();
    };// end handleClickViewTranslation

    switch (pageState.state)
    {
      case pageStates.PAGE_STATE_UNTRANSLATED:
        return null;
      case pageStates.PAGE_STATE_REQUESTING:
        return (
            <div className="bg-green-200">
                Processing translation request ...
            </div>
        );
      case pageStates.PAGE_STATE_VIEWING_TRANSLATION:
        return (
          <div className="flex flex-col">
            <span>Viewing Translation</span>
            <button onClick={handleClickViewOriginal} className="bg-blue-200 hover:bg-blue-400">
              View Original
            </button>
          </div>
        );
      case pageStates.PAGE_STATE_VIEWING_ORIGINAL:
        return (
          <div className="flex flex-col">
            <span>Viewing Original</span>
            <button onClick={handleClickViewTranslation} className="bg-blue-200 hover:bg-blue-400">
              View Translation
            </button>
          </div>
        );
      default:
        return (
          <div className="bg-red-400">
            INVALID PAGE STATE: {pageState.state}
          </div>
        );
    }// end switch (pageState.state)
  })();

  return (
    <div id="translate-page">
      <h1 className="text-3xl font-bold font-serif">Translate LLM</h1>
      <TranslateForm onSubmit={handleSubmitTranslateForm} />
      {pageStatePanel}
    </div>
  );
};// end Popup

const initPage = async () =>
{
  const el = document.getElementById('root');
  const root = ReactDOM.createRoot(el);

  root.render(
    <Provider store={store}>
      <Popup />
    </Provider>
  );
};// end initPage

const addEventListeners = () =>
{
    const reportError = (err) =>
    {
        console.log(`error encountered while triggering translate page: ${err}`);
    };// end reportError
        
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
    .then(() =>
    {
      // request page state
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(requestState)
        .catch(reportExecuteScriptError);
    })
    .catch(reportExecuteScriptError);

browser.runtime.onMessage.addListener((message) =>
{
  switch (message.command)
  {
    case 'dispatch':
      {
        store.dispatch(message.parameters);
      }
      break;
    case 'postState':
      {
        const { pageState } = message.parameters;

        console.log(`pageState: ${JSON.stringify(pageState, true, 2)}`);
        store.dispatch(pageStateMutator.replace(pageState));
      }
      break;
    default:
      {
        console.error(`unrecognized message command: ${message.command}`);
      }
  }// end switch (message.command)
});

// load settings
initPage();
