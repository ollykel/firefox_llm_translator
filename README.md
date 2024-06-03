# Firefox LLM Translator

Automatically translate the webpage you are viewing from whatever language it is
in to the language of your choice, using the magic of ChatGPT.

Requires an OpenAI API key. ([Instructions for acquiring an API key.](https://gptforwork.com/help/knowledge-base/create-openai-api-key))

NOTE: This is a third-party application. The developer of this application is
not affiliated with OpenAI.

## Usage
The process of translating a webpage is extremely simple. In the popup window,
simply enter your API key, the desired language to translate to, and the maximum
character limit. The webpage will be translated piece-by-piece, usually taking
no more than half a minute total. Entering the source language is not necessary:
LLM will detect it automatically.

There is no limit to the number of languages you can translate to: any language
with content available on the internet can potentially be translated by ChatGPT.
In addition to the major world languages, you can choose regional dialects,
extinct languages, older forms of current languages, and even invented
languages. Keep in mind, of course, that the quality of the translation 

The character limit exists to prevent excessively large requests to the API.
Keep in mind that OpenAI measures usage of ChatGPT in units called tokens, whose
sizes vary widely based on the format of the input. The number of characters per
token varies widely by language, largely correlating with the language's
similarity to English; on average, one English word equals 1.3 tokens, but one
Hindi word equals 6.4 tokens. Please be aware of your token usage and check your
chosen ChatGPT model's pricing policy per token.

Keep in mind that any content on the webpage may possibly be sent to OpenAI in
the process of translation. Do not use this extension on any webpage which
contains personal or security-critical information.

## Building and Installing

To build the extension, simply run make in the current directory. The built
extension will be contained in the directory target/. npm is required for
building this project; all dependencies are listed in package.json.

To install the extension as-is, you will need [Firefox Developer
Edition](https://www.mozilla.org/en-US/firefox/developer/).

To load the extension temporarily, follow the following steps:

- Navigate to about:debugging
- Click the "This Firefox" button on the top-left of the page.
- Under the "Temporary Extensions" menu in the center of the page, click the
  button "Load Temporary Add-on".
- You will be shown a file selection menu. Find the "target" directory of this
  repository and select any file within it.

To install the extension permanently, follow the following steps:

- Navigate to about:addons
- Click the settings button to the right of "Manage Your Extensions", and select
  "Install Add-on From File"
- Navigate to this repository's directory, then select
  llm\_translator.xpi. 
- You will be prompted to confirm whether to add this extension, as it is
  unverified. If you choose to, click "Add".

## Settings

To locate the settings menu, go to about:addons and select the module named "LLM
Translator", then select the "Preferences" tab.

Settings options include:

- (default) Model: The ChatGPT model to use by default. Default value is
  gpt-3.5-turbo.
- API Key: The API key to use by default.
- Temperature: A numeric value which determines how creative or literal
  ChatGPT's output is. Higher values enable more creativity, while lower values
  lead to more literal output. Default value is 0.7.

## Known Problems

The quality of the translations is wholly dependent upon LLM provided by OpenAI.
The LLM may misunderstand the prompt or misinterpret the source text on any
given query. Consider retranslating the page to clarify any ambiguities found in
the translated text.

Not every query to the LLM will be successful. Currently unsuccessful queries
are not retransmitted during a single translation request.

Many sites have a content security policy which disables API queries to openai.
There is currently no workaround to this problem.

## License

This repository is available according to the terms of the MIT license. (see
[LICENSE](./LICENSE))

## Author

Project created by Oliver Kelton <oakelton@gmail.com>.
