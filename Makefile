MAKEFLAGS += -rR

.SUFFIXES:
.SUFFIXES: .js .ts

ROOT := $(CURDIR)
SOURCE_DIR := $(ROOT)/src
TEST_DIR := $(ROOT)/test
BUILD_DIR := $(ROOT)/build
SOURCE_BUILD_DIR := $(BUILD_DIR)/src
TEST_BUILD_DIR := $(BUILD_DIR)/test
COVERAGE_DIR := $(BUILD_DIR)/coverage

BIN := $(ROOT)/node_modules/.bin
TSC := $(BIN)/tsc
TSLINT := $(BIN)/tslint
MOCHA := $(BIN)/_mocha
ISTANBUL := $(BIN)/istanbul
REMAP_ISTANBUL := $(BIN)/remap-istanbul

SOURCES := $(shell find $(SOURCE_DIR)/ts -type f -name '*.ts' -and -not -name '*.d.ts')
TESTS := $(shell find $(TEST_DIR)/ts -type f -name '*Test.ts' -and -not -name '*.d.ts')

TARGETS := $(shell echo $(SOURCES) | sed -r 's|\.ts|.js|g' | sed 's|$(SOURCE_DIR)/ts|$(SOURCE_BUILD_DIR)/ts|g')
TEST_TARGETS := $(shell echo $(TESTS) | sed -r 's|\.ts|.js|g' | sed 's|$(TEST_DIR)/ts|$(TEST_BUILD_DIR)/ts|g')

TS_MODULE := commonjs
TS_TARGET := es2015

.PHONY: all test test-coverage clean lint setup
.NOTPARALLEL: $(TARGETS) $(TEST_TARGETS)

all: $(TARGETS) $(SOURCE_BUILD_DIR)/index.html $(SOURCE_BUILD_DIR)/css/main.css

test: all $(TEST_TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(MOCHA) $(TEST_BUILD_DIR)/ts

test-coverage: all $(TEST_TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(ISTANBUL) cover --report none --dir $(COVERAGE_DIR)/ts --include-all-sources $(MOCHA) -- $(TEST_BUILD_DIR)/ts
	@$(REMAP_ISTANBUL) -i $(COVERAGE_DIR)/ts/coverage.json -o $(COVERAGE_DIR)/ts/report -t html

$(SOURCE_BUILD_DIR)/index.html:
	@cp $(SOURCE_DIR)/html/index.html $(SOURCE_BUILD_DIR)

$(SOURCE_BUILD_DIR)/css/main.css:
	@mkdir -p $(SOURCE_BUILD_DIR)/css
	@cp $(SOURCE_DIR)/css/main.css $(SOURCE_BUILD_DIR)/css/

$(TARGETS): $(SOURCE_BUILD_DIR)/ts/%.js: $(SOURCE_DIR)/ts/%.ts
	@$(TSC) --module $(TS_MODULE) --target $(TS_TARGET) --project .

$(TEST_TARGETS): $(TEST_BUILD_DIR)/ts/%.js: $(TEST_DIR)/ts/%.ts
	@$(TSC) --module $(TS_MODULE) --target $(TS_TARGET) --project .

$(TARGETS): | $(BUILD_DIR)
$(TEST_TARGETS): | $(BUILD_DIR)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

clean:
	@rm -rf $(BUILD_DIR)

lint:
	@$(TSLINT) --project tsconfig.json --type-check $(SOURCES) $(TESTS)

setup: clean
	@rm -rf node_modules
	@npm install