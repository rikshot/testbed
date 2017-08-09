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

extern "C" {
	uint32_t * EMSCRIPTEN_KEEPALIVE iterate(char const * const rawConfig, char const * const rawChunkConfig) {
		json const config(json::parse(rawConfig));
		json const chunkConfig(json::parse(rawChunkConfig));

		auto const & image = chunkConfig["image"];
		auto const & complex = chunkConfig["complex"];

		double const log2 = std::log(2);
		uint32_t const max_iterations = config["iterations"];
		uint32_t * const data = new uint32_t[image["width"].get<uint32_t>() * image["height"].get<uint32_t>()];

		double const red = config["red"];
		double const green = config["green"];
		double const blue = config["blue"];

		auto colors = std::vector<Color>();
		for (std::size_t i(0); i < max_iterations; ++i) {
			double const percentage = (double)i / (double)max_iterations;
			colors.emplace_back(Color(
				std::min(255.0, std::floor(255 * percentage * red)),
				std::min(255.0, std::floor(255 * percentage * green)),
				std::min(255.0, std::floor(255 * percentage * blue))
			));
		}

		NumberRange const widthRange = NumberRange(image["start"]["x"], image["end"]["x"]);
		NumberRange const heightRange = NumberRange(image["start"]["y"], image["end"]["y"]);
		NumberRange const realRange = NumberRange(complex["start"]["x"], complex["end"]["x"]);
		NumberRange const imaginaryRange = NumberRange(complex["start"]["y"], complex["end"]["y"]);

		uint32_t index = 0;
		for(uint32_t y(image["start"]["y"]); y < image["end"]["y"].get<uint32_t>(); ++y) {
			for(uint32_t x(image["start"]["x"]); x < image["end"]["x"].get<uint32_t>(); ++x, ++index) {
				double i0 = NumberRange::Scale(widthRange, x, realRange);
				double j0 = NumberRange::Scale(heightRange, y, imaginaryRange);

				double jj0 = j0 * j0;
				double q = i0 - 0.25;
				q *= q;
				q += jj0;

				Color color = Color::Black;
				if(q * (q + (i0 - 0.25)) >= 0.25 * jj0) {
					double iterations = 0;
					double ii = 0.0;
					double jj = 0.0;
					for(double i(0), j(0); ii + jj < std::pow(2, 16) && iterations < max_iterations; ii = i * i, jj = j * j, ++iterations) {
						double itemp = ii - jj + i0;
						double jtemp = 2 * i * j + j0;
						if(i == itemp && j == jtemp) {
							iterations = max_iterations;
							break;
						}
						i = itemp;
						j = jtemp;
					}
					if (iterations < max_iterations) {
						iterations += 1 - std::log(std::log(ii + jj) / 2.0 / log2) / log2;
						Color color1 = colors[std::floor(iterations)];
						Color color2 = colors[std::floor(iterations) + 1];
						color = Color::Lerp(color1, color2, std::fmod(iterations, 1.0));
					}
				}
				data[index] = color.abgr;
			}
		}

		return data;
	}
}