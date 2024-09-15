import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const reportError = (err) =>
{
    console.log(`error encountered while triggering translate page: ${err}`);
};// end reportError

const translationRequestApi = createApi({
  reducersPath: 'translationRequest',
  baseQuery: fetchBaseQuery({
    baseUrl: '',
    fetchFn: async (url, options) =>
    {
      const command = url.substring(1);
      const { method } = options;
      let sendRequest = null;

      if (options.method === "POST")
      {
        const { body } = options;

        sendRequest = (tabs) =>
        {
          browser.tabs.sendMessage(tabs[0].id, {
            command, method, body
          });
        };// end sendRequest
      }
      else
      {
        sendRequest = (tabs) =>
        {
          browser.tabs.sendMessage(tabs[0].id, {
            command, method
          });
        };// end sendRequest
      }
      
      browser.tabs
        .query({ active: true, currentWindow: true})
        .then(sendRequest)
        .catch(reportError);
    }
  })
});
