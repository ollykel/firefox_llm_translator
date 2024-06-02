# build tools
CP=cp
WEBPACK=npx webpack

# targets
TARGET_DIR=target
SRC_DIR=src
TARGETS_JS=$(TARGET_DIR)/content_scripts/translate.js $(TARGET_DIR)/options/options.js $(TARGET_DIR)/popup/translate.js
TARGETS=$(TARGET_DIR)/manifest.json $(TARGET_DIR)/options/options.html $(TARGET_DIR)/popup/translate.html $(TARGET_DIR)/master.css $(TARGETS_JS)
PACKAGE=firefox_llm_autotranslate.xpi

$(TARGET_DIR)/%.js : $(SRC_DIR)/%.js
	$(WEBPACK)

$(TARGET_DIR)/%.json : $(SRC_DIR)/%.json
	$(CP) $< $@

$(TARGET_DIR)/%.html : $(SRC_DIR)/%.html
	$(CP) $< $@

$(TARGET_DIR)/%.css : $(SRC_DIR)/%.css
	$(CP) $< $@

all : $(TARGETS) $(PACKAGE)

clean:
	$(RM) $(TARGETS)
	$(RM) $(PACKAGE)

lint : eslint.config.js
	npx eslint

$(TARGET_DIR)/manifest.json :					$(SRC_DIR)/manifest.json

$(TARGET_DIR)/content_scripts/translate.js :	$(SRC_DIR)/content_scripts/translate.js $(SRC_DIR)/content_scripts/ElementVisitor.js webpack.config.js

$(TARGET_DIR)/options/options.html :			$(SRC_DIR)/options/options.html

$(TARGET_DIR)/options/options.js :				$(SRC_DIR)/options/options.js $(SRC_DIR)/config.json $(SRC_DIR)/utils.js webpack.config.js

$(TARGET_DIR)/popup/translate.html :			$(SRC_DIR)/popup/translate.html

$(TARGET_DIR)/popup/translate.js :				$(SRC_DIR)/popup/translate.js $(SRC_DIR)/config.json $(SRC_DIR)/utils.js webpack.config.js

$(TARGET_DIR)/master.css :						$(SRC_DIR)/master.css

$(PACKAGE) :									$(TARGETS) package.sh
	./package.sh

