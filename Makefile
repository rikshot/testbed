MAKEFLAGS += -rR

SOURCE_DIR := src
TEST_DIR := test
BUILD_DIR := build
SOURCE_BUILD_DIR := $(BUILD_DIR)/src
TEST_BUILD_DIR := $(BUILD_DIR)/test

BIN := node_modules/.bin
TSC := $(BIN)/tsc
TSLINT := $(BIN)/tslint
MOCHA := $(BIN)/_mocha
NYC := $(BIN)/nyc

SOURCES := $(shell find $(SOURCE_DIR) -type f -not -name '*.d.ts')
TESTS := $(shell find $(TEST_DIR) -type f -name '*Test.ts' -and -not -name '*.d.ts')

TARGETS := $(addprefix $(BUILD_DIR)/, $(patsubst %.ts, %.js, $(filter %.ts %.html %.css, $(SOURCES))))
TEST_TARGETS := $(addprefix $(BUILD_DIR)/, $(patsubst %.ts, %.js, $(filter %.ts, $(TESTS))))

.PHONY: all test test-coverage clean lint setup watch
.NOTPARALLEL: $(TARGETS) $(TEST_TARGETS)

all: $(TARGETS)

test: $(TEST_TARGETS) $(TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(MOCHA) --require script/text-require $(TEST_BUILD_DIR)/ts

test-coverage: $(TEST_TARGETS) $(TARGETS)
	@NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(NYC) $(MOCHA) --require script/text-require $(TEST_BUILD_DIR)/ts

vpath %.ts $(SOURCE_DIR)/ts $(TEST_DIR)/ts
vpath %.html $(SOURCE_DIR)/html
vpath %.css $(SOURCE_DIR)/css
vpath %.cpp $(SOURCE_DIR)/cpp

$(SOURCE_BUILD_DIR)/ts/%.js: %.ts
	@$(TSC) --project tsconfig.json

$(SOURCE_BUILD_DIR)/html/%.html: %.html
	@mkdir -p $(dir $@) && cp $< $@

$(SOURCE_BUILD_DIR)/css/%.css: %.css
	@mkdir -p $(dir $@) && cp $< $@

$(TEST_BUILD_DIR)/ts/%.js: %.ts
	@$(TSC) --project tsconfig.test.json

%::
	@mkdir -p $@

$(TARGETS): | $(SOURCE_BUILD_DIR)/ts $(SOURCE_BUILD_DIR)/html $(SOURCE_BUILD_DIR)/css
$(TEST_TARGETS): | $(TEST_BUILD_DIR)/ts

clean:
	@rm -rf $(BUILD_DIR)

lint:
	@$(TSLINT) --project tsconfig.test.json --type-check $(filter %.ts, $(SOURCES)) $(TESTS)

setup: clean
	@rm -rf node_modules
	@npm install

watch: $(TEST_TARGETS) $(TARGETS)
	@watchman-make -p '$(SOURCE_DIR)/**' -t all -p '$(TEST_DIR)/**' -t test
