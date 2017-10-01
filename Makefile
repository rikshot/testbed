MAKEFLAGS += -rR

SOURCE_DIR := src
TEST_DIR := test
BUILD_DIR := build
SOURCE_BUILD_DIR := $(BUILD_DIR)/$(SOURCE_DIR)
TEST_BUILD_DIR := $(BUILD_DIR)/$(TEST_DIR)

BIN := node_modules/.bin
TSC := $(BIN)/tsc
TSLINT := $(BIN)/tslint
MOCHA := $(BIN)/_mocha
NYC := $(BIN)/nyc

SOURCES := $(shell find $(SOURCE_DIR) -type f -not -name '*.d.ts')
TESTS := $(shell find $(TEST_DIR) -type f -not -name '*.d.ts')

TARGETS := $(addprefix $(BUILD_DIR)/, $(patsubst %.ts, %.js, $(filter %.ts %.html %.css, $(SOURCES))))
TEST_TARGETS := $(addprefix $(BUILD_DIR)/, $(patsubst %.ts, %.js, $(filter %.ts %.html, $(TESTS))))

.PHONY: all test test-coverage clean lint setup watch
.NOTPARALLEL: $(TARGETS) $(TEST_TARGETS)

all: $(TARGETS)

test: $(TEST_TARGETS) $(TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(MOCHA) --opts .mocha.opts $(TEST_TARGETS)

test-coverage: $(TEST_TARGETS) $(TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(NYC) $(MOCHA) --opts .mocha.opts $(TEST_TARGETS)

vpath %.ts $(SOURCE_DIR)/ts $(TEST_DIR)/ts
vpath %.html $(SOURCE_DIR)/html $(TEST_DIR)/html
vpath %.css $(SOURCE_DIR)/css

$(SOURCE_BUILD_DIR)/ts/%.js: %.ts
	@$(TSC) --project tsconfig.json

$(SOURCE_BUILD_DIR)/html/%.html: %.html
	@mkdir -p $(dir $@) && cp $< $@

$(SOURCE_BUILD_DIR)/css/%.css: %.css
	@mkdir -p $(dir $@) && cp $< $@

$(TEST_BUILD_DIR)/ts/%.js: %.ts
	@$(TSC) --project tsconfig.json

$(TEST_BUILD_DIR)/html/%.html: %.html
	@mkdir -p $(dir $@) && cp $< $@

%::
	$(warning No rule specified for target "$@")

$(filter %.js, $(TARGETS)): | $(SOURCE_BUILD_DIR)/ts
$(filter %.html, $(TARGETS)): | $(SOURCE_BUILD_DIR)/html
$(filter %.css, $(TARGETS)): | $(SOURCE_BUILD_DIR)/css

$(filter %.js, $(TEST_TARGETS)): | $(TEST_BUILD_DIR)/ts
$(filter %.html, $(TEST_TARGETS)): | $(TEST_BUILD_DIR)/html

clean:
	@rm -rf $(BUILD_DIR)

lint:
	@$(TSLINT) --project tsconfig.json --type-check $(filter %.ts, $(SOURCES)) $(filter %.ts, $(TESTS))

setup: clean
	@rm -rf node_modules
	@npm install

watch: $(TEST_TARGETS) $(TARGETS)
	@watchman-make -p '$(SOURCE_DIR)/**' -t all test -p '$(TEST_DIR)/**' -t test
