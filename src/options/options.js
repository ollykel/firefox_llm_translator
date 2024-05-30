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
  loadSettings,
  saveSettings
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

    const settings = getFormValues(ev.target);

    saveSettings(settings)
      .then(() => alert('Extension settings saved.'))
      .catch(logError);
};// end handleSubmit

// === add listeners ===========================================================
document.getElementById("settings-form").addEventListener("submit", handleSubmit);
window.addEventListener("load", initSettingsForm);
