# Options

MAKEFLAGS += -rRs

# Binaries

BIN := node_modules/.bin
TSC := $(BIN)/tsc
TSLINT := $(BIN)/tslint
TAPE := $(BIN)/tape
TAP_SPEC := $(BIN)/tap-spec
NYC := $(BIN)/nyc
ROLLUP := $(BIN)/rollup
CC := npx google-closure-compiler
EM++ := em++
CARGO := cargo

# Directories

SOURCE_DIR := src
TEST_DIR := test
BUILD_DIR := build
SOURCE_BUILD_DIR := $(BUILD_DIR)/$(SOURCE_DIR)
TEST_BUILD_DIR := $(BUILD_DIR)/$(TEST_DIR)

# Sources

SOURCES := $(shell find $(SOURCE_DIR) -type f -not -name '*.d.ts')
TESTS := $(shell find $(TEST_DIR) -type f -not -name '*.d.ts')

# Targets

TARGETS := $(addprefix $(BUILD_DIR)/, \
			$(patsubst src/rs/%.rs, src/rs/wasm32-unknown-unknown/debug/%.wasm, \
			$(patsubst %.cpp, %.js, \
			$(patsubst %.ts, %.js, \
			$(filter %.ts %.html %.json %.css %.cpp %.rs, $(SOURCES))))))
TEST_TARGETS := $(addprefix $(BUILD_DIR)/, $(patsubst %.ts, %.js, $(filter %.ts %.html, $(TESTS))))

# Built-in targets

.PHONY: all test test-coverage release clean lint setup watch
.NOTPARALLEL: $(TARGETS) $(TEST_TARGETS)

# Main targets

all: $(TARGETS)

test: $(TEST_TARGETS) $(TARGETS)
	NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(TAPE) -r ./script/text-require $(TEST_TARGETS) | $(TAP_SPEC)

test-coverage: $(TEST_TARGETS) $(TARGETS)
	NODE_PATH=$(SOURCE_BUILD_DIR):$(SOURCE_BUILD_DIR)/ts:$(TEST_BUILD_DIR)/ts $(NYC) $(TAPE) -r ./script/text-require $(TEST_TARGETS)

release: all
	$(ROLLUP) --config
	$(CC) $(shell xargs -a .cc.opts) --js $(SOURCE_BUILD_DIR)/ts/Fractal/Bundle.js --js_output_file build/src/ts/Fractal/Bundle.min.js
	$(CC) $(shell xargs -a .cc.opts) --js $(SOURCE_BUILD_DIR)/ts/Sandbox/Bundle.js --js_output_file build/src/ts/Sandbox/Bundle.min.js

# VPaths

vpath %.ts $(SOURCE_DIR)/ts $(TEST_DIR)/ts
vpath %.html $(SOURCE_DIR)/html $(TEST_DIR)/html
vpath %.json $(SOURCE_DIR)/json
vpath %.css $(SOURCE_DIR)/css
vpath %.cpp $(SOURCE_DIR)/cpp
vpath %.rs $(SOURCE_DIR)/rs

# Implicit rules

$(SOURCE_BUILD_DIR)/ts/%.js: %.ts
	$(TSC) --project tsconfig.json

$(SOURCE_BUILD_DIR)/html/%.html: %.html
	mkdir -p $(dir $@) && cp $< $@

$(SOURCE_BUILD_DIR)/json/%.json: %.json
	mkdir -p $(dir $@) && cp $< $@

$(SOURCE_BUILD_DIR)/css/%.css: %.css
	mkdir -p $(dir $@) && cp $< $@

$(SOURCE_BUILD_DIR)/cpp/%.js: %.cpp
	#mkdir -p $(dir $@) && $(EM++) -std=c++14 -s WASM=1 -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "stringToUTF8", "lengthBytesUTF8", "_free"]' -O3 --llvm-lto 3 --closure 1 -o $@ $<

$(SOURCE_BUILD_DIR)/rs/wasm32-unknown-unknown/debug/%.wasm: %.rs
	#mkdir -p $(dir $@) && $(CARGO) build --target wasm32-unknown-unknown
	#wasm-gc $(SOURCE_BUILD_DIR)/rs/wasm32-unknown-unknown/debug/mandelbrot.wasm

$(TEST_BUILD_DIR)/ts/%.js: %.ts
	$(TSC) --project tsconfig.json

$(TEST_BUILD_DIR)/html/%.html: %.html
	mkdir -p $(dir $@) && cp $< $@

%::
	$(warning No rule specified for target "$@")

# Directory rules

$(filter %.js, $(TARGETS)): | $(SOURCE_BUILD_DIR)/ts $(SOURCE_BUILD_DIR)/cpp
$(filter %.html, $(TARGETS)): | $(SOURCE_BUILD_DIR)/html
$(filter %.json, $(TARGERS)): | $(SOURCE_BUILD_DIR)/json
$(filter %.css, $(TARGETS)): | $(SOURCE_BUILD_DIR)/css
$(filter %.wasm, $(TARGETS)): | $(SOURCE_BUILD_DIR)/rs

$(filter %.js, $(TEST_TARGETS)): | $(TEST_BUILD_DIR)/ts
$(filter %.html, $(TEST_TARGETS)): | $(TEST_BUILD_DIR)/html

# Helper targets

clean:
	rm -rf $(BUILD_DIR)

lint:
	$(TSLINT) --project tsconfig.json $(filter %.ts, $(SOURCES)) $(filter %.ts, $(TESTS))

setup: clean
	rm -rf node_modules
	npm install

watch: all
	parallel --ungroup --tty --jobs 0 ::: \
		'$(TSC) --project tsconfig.json --watch --preserveWatchOutput' \
		'$(ROLLUP) --config rollup.config.fractal.js --watch'
