// Handles setting options.

const OPTION_DEFAULTS =
{
    "model": "gpt-3.5-turbo",
    "apiKey": "",
    "temperature": 0.7
};

const logError = (e) =>
{
    console.log(`ERROR: ${e}`);
};// end logError

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

const getFormInputs = (form) =>
{
    let nameToInputMap = {};

    for (const elem of form.elements)
    {
        if (elem.nodeName === 'INPUT')
        {
            const name = elem.name;

            nameToInputMap[name] = elem;
        }
    }// end for (const elem of form.elements)
    
    return nameToInputMap;
};// end getFormInputs

const getFormValues = (form) =>
{
    const nameToInputMap = getFormInputs(form);

    return Object.fromEntries(Object.entries(nameToInputMap).map(([k, input]) =>
    {
        switch (input.type)
        {
            case 'number':
                return [k, Number(input.value)];
            case 'submit':
                return null;
            default:
                return [k, input.value];
        }// end switch (input.type)
    }).filter((entry) => entry !== null));
};// end getFormValues

const handleSubmit = (ev) =>
{
    ev.preventDefault();

    const formValues = getFormValues(ev.target);

    browser.storage.sync.set(formValues);
    alert('Extension settings saved.');
};// end handleSubmit

// === add listeners ===========================================================
document.getElementById("settings-form").addEventListener("submit", handleSubmit);
