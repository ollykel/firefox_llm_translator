// Handles setting options.

const {
  KEY_API_SETTINGS,
  OPTION_DEFAULTS
} = require('../config.json');

const {
  extractObj,
  getFormInputs,
  getInputValue,
  getFormValues,
  setFormInputs
} = require('../utils.js');

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const loadSettings = () =>
{
    const form = document.getElementById("settings-form");

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

const handleSubmit = (ev) =>
{
    ev.preventDefault();

    const formValues = getFormValues(ev.target);

    browser.storage.sync.set(Object.fromEntries([[KEY_API_SETTINGS, formValues]]));
    alert('Extension settings saved.');
};// end handleSubmit

// === add listeners ===========================================================
document.getElementById("settings-form").addEventListener("submit", handleSubmit);
window.addEventListener("load", loadSettings);
