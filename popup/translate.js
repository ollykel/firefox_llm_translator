// Inject the content script at popup load time.

const apiEndpoint = 'https://api.example.com/translate';// TODO: implement non-mock
const apiKey = 'XXXX';// TODO: implement non-mock

const apiConfig = {
    apiEndpoint,
    apiKey
};// TODO: implement non-mock

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

const addSubmitListener = () =>
{
    document.getElementById('translate-form').addEventListener("submit", (e) =>
    {
        e.preventDefault();
        
        const form = e.target;
        const inputValues = getFormValues(form);
        const targetLanguage = inputValues['target-language'];
        
        const reportError = (err) =>
        {
            console.log(`error encountered while triggering translate page: ${err}`);
        };// end reportError
        
        const triggerTranslatePage = (tabs) =>
        {
            browser.tabs.sendMessage(tabs[0].id, {
              command: "translatePage",
              parameters: {
                  targetLanguage,
                  apiConfig
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
