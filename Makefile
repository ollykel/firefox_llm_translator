# build tools
CP=cp
WEBPACK=npx webpack

# targets
TARGET_DIR=target
SRC_DIR=src
TARGETS=$(TARGET_DIR)/manifest.json $(TARGET_DIR)/utils.js $(TARGET_DIR)/content_scripts/translate.js $(TARGET_DIR)/options/options.html $(TARGET_DIR)/options/options.js $(TARGET_DIR)/popup/translate.html $(TARGET_DIR)/popup/tranlate.js $(TARGET_DIR)/popup/translate.css

%.js : %.js
	$(WEBPACK)

%.json : %.json
	$(CP) $< $@

%.html : %.html
	$(CP) $< $@

%.css : %.css
	$(CP) $< $@

all : $(TARGETS)

clean:
	$(RM) $(TARGETS)


$(TARGET_DIR)/manifest.json :					$(SRC_DIR)/manifest.json

$(TARGET_DIR)/utils.js :						$(SRC_DIR)/utils.js

$(TARGET_DIR)/content_scripts/translate.js :	$(SRC_DIR)/content_scripts/translate.js

$(TARGET_DIR)/options/options.html :			$(SRC_DIR)/options/options.html

$(TARGET_DIR)/options/options.js :				$(SRC_DIR)/options/options.js

$(TARGET_DIR)/popup/translate.html :			$(SRC_DIR)/popup/translate.html

$(TARGET_DIR)/popup/tranlate.js :				$(SRC_DIR)/popup/tranlate.js

$(TARGET_DIR)/popup/translate.css :				$(SRC_DIR)/popup/translate.css

