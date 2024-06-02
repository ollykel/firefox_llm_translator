#!/bin/bash

dest="${PWD}/firefox_llm_autotranslate.xpi"
files=(
content_scripts/translate.js
options/options.html
options/options.js
manifest.json
popup/translate.html
popup/translate.js
master.css
)

cd target/

zip "${dest}" "${files[@]}"
