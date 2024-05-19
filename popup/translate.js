// Inject the content script at popup load time.

const getFormValues = (form) =>
{
  const accumulator = (accum, currInput) =>
  {
    if (currInput.nodeName === 'INPUT')
    {
      const inputName = currInput.name;
      const inputValue = currInput.value;

      accum[inputName] = inputValue;
    }

    return accum;
  };// end accumulator

  return form.elements.reduce(accumulator, {});
};// end getFormValues

const addSubmitListener = () =>
{
  document.getElementById('translate-form').addEventListener("submit", (e) =>
  {
    e.preventDefault();

    const form = e.target;
    // const inputValues = getFormValues(form);
    // const targetLanguage = inputValues['target-language'];
    const targetLanguage = 'hello';// TODO: replace stub

    const reportError = (err) =>
    {
      console.log(`error encountered while triggering translate page: ${err}`);
    };// end reportError

    const triggerTranslatePage = (tabs) =>
    {
      browser.tabs.sendMessage(tabs[0].id, {
        command: "translatePage",
        parameters: {
          targetLanguage
        }
      });
    };// end triggerTranslatePage

    browser.tabs
      .query({ active: true, currentWindow: true})
      .then(triggerTranslatePage)
      .catch(reportError);
  });
};// end addSubmitListener

const reportExecuteScriptError = (error) =>
{
  console.log(`Translate popup script failed: ${error}`);
};// end reportExecuteScriptError

// insert content script
browser.tabs
  .executeScript({ file: "/content_scripts/translate.js" })
  .then(addSubmitListener)
  .catch(reportExecuteScriptError);
