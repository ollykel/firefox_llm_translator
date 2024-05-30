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
  setFormInputs,
  loadSettings
} = require('../utils.js');

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

const initSettingsForm = () =>
{
    const form = document.getElementById("settings-form");

    loadSettings()
      .then((nameToValueMap) => setFormInputs(form, nameToValueMap));
};// end initSettingsForm

const handleSubmit = (ev) =>
{
    ev.preventDefault();

    const formValues = getFormValues(ev.target);

    browser.storage.sync.set(Object.fromEntries([[KEY_API_SETTINGS, formValues]]));
    alert('Extension settings saved.');
};// end handleSubmit

// === add listeners ===========================================================
document.getElementById("settings-form").addEventListener("submit", handleSubmit);
window.addEventListener("load", initSettingsForm);
