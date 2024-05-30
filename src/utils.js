// Miscellaneous utils.

const {
  KEY_API_SETTINGS,
} = require('./config.json');

const formatJSON = (obj) =>
{
    const formattedEntries = Object.entries(obj).map(([k, v]) => `"${k}": "${v}"`);

    return `{${formattedEntries.join(", ")}}`;
};// end formatJSON

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

        if (name in nameToValueMap)
        {
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
        }
    }// end for (const input of inputs)
};// end setFormInputs

const loadSettings = async () =>
{
    return browser.storage.sync.get(KEY_API_SETTINGS)
      .then((results) =>
      {
        if (KEY_API_SETTINGS in results)
        {
          return results[KEY_API_SETTINGS];
        }
        else
        {
          return {};
        }
      });
};// end loadSettings

const saveSettings = async (settings) =>
{
    return browser.storage.sync.set(
      Object.fromEntries([[KEY_API_SETTINGS, settings]])
    );
};// end saveSettings

module.exports = {
  formatJSON,
  extractObj,
  getFormInputs,
  getInputValue,
  getFormValues,
  setFormInputs,
  loadSettings,
  saveSettings
};
