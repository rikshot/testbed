#include <cstdint>
#include <cmath>

#include <emscripten/emscripten.h>

#include "json.hpp"

using json = nlohmann::json;

struct Color {
	static Color const Black;

	static Color Lerp(Color const & color1, Color const & color2, double value) {
		return Color(
			color1.red + (color2.red - color1.red) * value,
			color1.green + (color2.green - color1.green) * value,
			color1.blue + (color2.blue - color1.blue) * value,
			color1.alpha + (color2.alpha - color1.alpha) * value
		);
	}

	uint8_t red;
	uint8_t green;
	uint8_t blue;
	uint8_t alpha;

	uint32_t abgr;

	Color(uint8_t const red, uint8_t const green, uint8_t const blue, uint8_t const alpha = 0xFF) : 
		red(red), green(green), blue(blue), alpha(alpha), abgr((alpha << 24) ^ (blue << 16) ^ (green << 8) ^ red) {
	}
};

Color const Color::Black = Color(0, 0, 0);

struct NumberRange {
	static double Scale(NumberRange const & input, double value, NumberRange const & output) {
		return (input.max * output.min - input.min * output.max + value * output.size) / input.size;
	}

	double const min;
	double const max;
	double const size;

	NumberRange(double const min, double const max) : min(min), max(max), size(std::abs(max - min)) {}
};

struct Buffers {
	uint32_t * const histogram;
	uint32_t * const iterations;
	double * const fractionals;
};

struct ChunkResult {
	Buffers const buffers;
	uint32_t const total;
};

ChunkResult * iterateChunkImpl(char const * const rawConfig, char const * const rawChunkConfig) {
	json const config(json::parse(rawConfig, nullptr, false));
	json const chunkConfig(json::parse(rawChunkConfig, nullptr, false));

	auto const & image = chunkConfig["image"];
	auto const & complex = chunkConfig["complex"];

	uint32_t const width = image["width"];
	uint32_t const height = image["height"];

	double const ln2 = std::log(2.0);
	uint32_t const max_iterations = config["iterations"];

	uint32_t * const histogram = new uint32_t[max_iterations]();
	uint32_t * const iterations = new uint32_t[width * height]();
	double * const fractionals = new double[width * height]();

	NumberRange const widthRange = NumberRange(image["start"]["x"], image["end"]["x"]);
	NumberRange const heightRange = NumberRange(image["start"]["y"], image["end"]["y"]);
	NumberRange const realRange = NumberRange(complex["start"]["x"], complex["end"]["x"]);
	NumberRange const imaginaryRange = NumberRange(complex["start"]["y"], complex["end"]["y"]);

	uint32_t total = 0;
	uint32_t index = 0;
	for(uint32_t y(image["start"]["y"]); y < image["end"]["y"].get<uint32_t>(); ++y) {
		for(uint32_t x(image["start"]["x"]); x < image["end"]["x"].get<uint32_t>(); ++x, ++index) {
			double i0 = NumberRange::Scale(widthRange, x, realRange);
			double j0 = NumberRange::Scale(heightRange, y, imaginaryRange);

			double jj0 = j0 * j0;
			double q = i0 - 0.25;
			q *= q;
			q += jj0;

			if(q * (q + (i0 - 0.25)) < 0.25 * jj0) {
				iterations[index] = max_iterations;
			} else {
				uint32_t iteration = 0;
				double ii = 0.0;
				double jj = 0.0;
				for(double i(0), j(0); ii + jj < std::pow(2, 16) && iteration < max_iterations; ii = i * i, jj = j * j, ++iteration) {
					double itemp = ii - jj + i0;
					double jtemp = 2 * i * j + j0;
					if(i == itemp && j == jtemp) {
						iteration = max_iterations;
						break;
					}
					i = itemp;
					j = jtemp;
				}
				iterations[index] = iteration;
				if (iteration < max_iterations) {
					++histogram[iteration];
					++total;
					fractionals[index] = std::fmod((double)iteration + 1.0 - std::log(std::log(ii + jj) / 2.0 / ln2) / ln2, 1.0);
				}
			}
		}
	}

	return new ChunkResult {
		Buffers {
			histogram,
			iterations,
			fractionals
		},
		total
	};
}

uint32_t * colorChunkImpl(char const * const rawConfig, char const * const rawChunkConfig, Buffers * const buffers, uint32_t const total) {
	json const config(json::parse(rawConfig, nullptr, false));
	json const chunkConfig(json::parse(rawChunkConfig, nullptr, false));

	uint32_t const max_iterations = config["iterations"];

	double const red = config["red"];
	double const green = config["green"];
	double const blue = config["blue"];

	auto const gradient = [=](double const n) {
		return Color(
			std::floor(255 * n * red),
			std::floor(255 * n * green),
			std::floor(255 * n * blue)
		);
	};

	auto const & image = chunkConfig["image"];
	uint32_t const width = image["width"];
	uint32_t const height = image["height"];
	uint32_t * const pixels = new uint32_t[width * height]();

	uint32_t index = 0;
	for(uint32_t y(image["start"]["y"]); y < image["end"]["y"].get<uint32_t>(); ++y) {
		for(uint32_t x(image["start"]["x"]); x < image["end"]["x"].get<uint32_t>(); ++x, ++index) {
			uint32_t const iteration = buffers->iterations[index];
			if (iteration < max_iterations) {
				double hue = 0.0;
				for (uint32_t i(0); i < iteration; ++i) {
					hue += (double)buffers->histogram[i] / (double)total;
				}
				Color const color1 = gradient(hue);
				Color const color2 = gradient(hue + (double)buffers->histogram[iteration] / (double)total);
				pixels[index] = Color::Lerp(color1, color2, buffers->fractionals[index]).abgr;
			} else {
				pixels[index] = Color::Black.abgr;
			}
		}
	}

	return pixels;
}

extern "C" {

	ChunkResult * EMSCRIPTEN_KEEPALIVE iterateChunk(char const * const rawConfig, char const * const rawChunkConfig) {
		return iterateChunkImpl(rawConfig, rawChunkConfig);
	}

	uint32_t * EMSCRIPTEN_KEEPALIVE colorChunk(char const * const rawConfig, char const * const rawChunkConfig, Buffers * const buffers, uint32_t const total) {
		return colorChunkImpl(rawConfig, rawChunkConfig, buffers, total);
	}

}
