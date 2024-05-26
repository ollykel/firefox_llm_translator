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
    const out = [];

    for (const elem of form.elements)
    {
        if (elem.nodeName === 'INPUT')
        {
            out.push(elem);
        }
    }// end for (const elem of form.elements)
    
    return out;
};// end getFormInputs

const getInputValue = (input) =>
{
    switch (input.type)
    {
        case 'button':
        case 'submit':
        case 'reset':
            return null;
        case 'checkbox':
            if (input.checked)
            {
                return [input.name, [input.value]];
            } else {
                return null;
            }
        case 'radio':
            if (input.checked)
            {
                return [input.name, input.value];
            } else {
                return null;
            }
        case 'color':
            return [input.name, input.value];
        case 'date':
            return [input.name, new Date(input.value)];
        case 'datetime-local':
            return [input.name, new Date(input.value)];
        case 'email':
            return [input.name, input.value];
        case 'file':
            return [input.name, input.files];
        case 'hidden':
            return [input.name, input.value];
        case 'image':
            return [input.name, input.src];
        case 'month':
            return [input.name, new Date(input.value)];
        case 'number':
            return [input.name, Number(input.value)];
        case 'password':
            return [input.name, input.value];
        case 'range':
            return [input.name, Number(input.value)];
        case 'search':
            return [input.name, input.value];
        case 'tel':
            return [input.name, input.value];
        case 'text':
            return [input.name, input.value];
        case 'time':
            return [input.name, new Date(input.value)];
        case 'url':
            return [input.name, input.value];
        case 'week':
            return [input.name, new Date(input.value)];
        default:
            return null;
    }
};// end getInputValue

const getFormValues = (form) =>
{
    const inputs = getFormInputs(form);
    const nameValuePairs = inputs
        .map(getInputValue)
        .reduce((accum, kv) =>
        {
            if (kv !== null)
            {
                const [name, val] = kv;

                if (name in accum)
                {
                    accum[name].push(...val);
                }
                else
                {
                    accum[name] = val;
                }
            }

            return accum;
        },
        {}
    );

    return nameValuePairs;
};// end getFormValues

const setFormInputs = (form, nameToValueMap) =>
{
    const inputs = getFormInputs(form);

    for (const input of inputs)
    {
        const name = input.name;
        const val = nameToValueMap[name];

        if (input.type === 'checkbox')
        {
            input.checked = val.include(input.value);
        }
        else if (input.type === 'radio')
        {
            input.checked = (input.value === val);
        }
        else
        {
            input.value = val;
        }
    }// end for (const input of inputs)
};// end setFormInputs

const handleSubmit = (ev) =>
{
    ev.preventDefault();

    const formValues = getFormValues(ev.target);

    browser.storage.sync.set(formValues);
    alert('Extension settings saved.');
};// end handleSubmit

// === add listeners ===========================================================
document.getElementById("settings-form").addEventListener("submit", handleSubmit);
