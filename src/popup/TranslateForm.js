import React from 'react';
import { useSelector } from 'react-redux';

import '../master.css';

const { useState } = React;

const makeChangeHandler = (setValue) =>
{
  return (ev) =>
  {
    const   value   = ev.target.value;

    setValue(value);
  };
};// end makeChangeHandler

const TranslateForm = ({ onSubmit }) =>
{
  const defaultValues = useSelector((state) => state.translator);
  const [targetLanguage, setTargetLanguage] = useState(defaultValues?.targetLanguage || "");
  const [characterLimit, setCharacterLimit] = useState(defaultValues?.characterLimit || 5000);
  const [apiKey, setApiKey] = useState(defaultValues?.apiKey || "");
  const [temperature, setTemperature] = useState(defaultValues?.temperature || 0.5);

  const changeTargetLanguage = makeChangeHandler(setTargetLanguage);
  const changeCharacterLimit = makeChangeHandler(setCharacterLimit);
  const changeApiKey = makeChangeHandler(setApiKey);
  const changeTemperature = makeChangeHandler(setTemperature);

  const handleSubmit = (ev) =>
  {
    ev.preventDefault();

    onSubmit({
      targetLanguage,
      characterLimit,
      apiKey,
      temperature
    });
  };// end handleSubmit

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <label htmlFor="targetLanguage">Target Language: </label>
      <input
        name="targetLanguage"
        type="text"
        value={targetLanguage}
        onChange={changeTargetLanguage}
        className="bg-gray-300 p-1"
        required
      />
      <label htmlFor="characterLimit">Character Limit: </label>
      <input
        name="characterLimit"
        type="number"
        min={1000}
        value={characterLimit}
        onChange={changeCharacterLimit}
        className="bg-gray-300 p-1"
        required
      />
      <label htmlFor="apiKey">API Key: </label>
      <input
        name="apiKey"
        type="password"
        value={apiKey}
        onChange={changeApiKey}
        className="bg-gray-300 p-1"
        required
      />
      <label htmlFor="temperature">Temperature:</label>
      <input
        type="number"
        id="temperature"
        name="temperature"
        step="0.01"
        min="0.0"
        max="1.0"
        value={temperature}
        onChange={changeTemperature}
        className="bg-gray-300 p-1"
        required
      />
      <button
        type="submit"
        className="text-2xl font-bold bg-blue-200 hover:bg-blue-400 my-2 rounded"
      >
        Translate
      </button>
    </form>
  );
};// end TranslateForm

export default TranslateForm;
