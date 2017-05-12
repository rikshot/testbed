BIN := node_modules/.bin
TSC := $(BIN)/tsc
TSLINT := $(BIN)/tslint
MOCHA := $(BIN)/_mocha
ISTANBUL := $(BIN)/istanbul
REMAP_ISTANBUL := $(BIN)/remap-istanbul

SOURCE_DIR := src
TEST_DIR := test
BUILD_DIR := build
COVERAGE_DIR := coverage

SOURCES := $(shell find $(SOURCE_DIR) -type f -name *.ts | xargs)
TESTS := $(shell find $(TEST_DIR) -type f -name *Test.ts | xargs)

TARGETS := $(shell echo $(SOURCES) | sed s/.ts/.js/g | sed s/$(SOURCE_DIR)/$(BUILD_DIR)\\/$(SOURCE_DIR)/g)
TEST_TARGETS := $(shell echo $(TESTS) | sed s/.ts/.js/g | sed s/$(TEST_DIR)/$(BUILD_DIR)\\/$(TEST_DIR)/g)

.PHONY: all test test-coverage clean lint

all: MODULE := commonjs
all: TARGET := es2015 
all: $(TARGETS)

test: MODULE := commonjs
test: TARGET := es2015
test: all $(TEST_TARGETS)
	@NODE_PATH=$(BUILD_DIR)/$(SOURCE_DIR):$(BUILD_DIR)/$(TEST_DIR) $(MOCHA) $(BUILD_DIR)/$(TEST_DIR)

test-coverage: MODULE := commonjs
test-coverage: TARGET := es2015
test-coverage: all $(TEST_TARGETS)
	@rm -rf $(COVERAGE_DIR)
	@NODE_PATH=$(BUILD_DIR)/$(SOURCE_DIR):$(BUILD_DIR)/$(TEST_DIR) $(ISTANBUL) cover --report none --dir $(COVERAGE_DIR) --include-all-sources $(MOCHA) -- $(BUILD_DIR)/$(TEST_DIR)
	@$(REMAP_ISTANBUL) -i $(COVERAGE_DIR)/coverage.json -o $(COVERAGE_DIR)/report -t html

$(TARGETS): $(BUILD_DIR)/$(SOURCE_DIR)/%.js: $(SOURCE_DIR)/%.ts
	@$(TSC) --module $(MODULE) --target $(TARGET) --project .

$(TEST_TARGETS): $(BUILD_DIR)/$(TEST_DIR)/%.js: $(TEST_DIR)/%.ts
	@$(TSC) --module $(MODULE) --target $(TARGET) --project .

$(TARGETS): | $(BUILD_DIR)
$(TEST_TARGETS): | $(BUILD_DIR)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf coverage
	@find $(SOURCE_DIR) -type f -name *.js | xargs rm -rf
	@find $(TEST_DIR) -type f -name *.js | xargs rm -rf

lint:
	@$(TSLINT) --project tsconfig.json --type-check --fix $(SOURCES) $(TESTS)