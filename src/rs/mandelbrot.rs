#[macro_use]
extern crate serde_derive;

extern crate serde;
extern crate serde_json;

extern crate num_traits;
use num_traits::float::Float;

use std::mem;
use std::ffi::{CString, CStr};
use std::os::raw::{c_void, c_char};

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr as *mut c_void
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut c_void, cap: usize) {
    let _buf = Vec::from_raw_parts(ptr, 0, cap);
}

#[derive(Serialize, Deserialize, Debug)]
struct Vector {
    x: f32,
    y: f32
}

#[derive(Serialize, Deserialize, Debug)]
struct Rectangle {
    start: Vector,
    end: Vector,
    width: f32,
    height: f32
}

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    iterations: f32,
    red: f32,
    green: f32,
    blue: f32,
    rectangle: Rectangle
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Buffers {
    histogram: Vec<u32>,
    iterations: Vec<u32>,
    fractionals: Vec<f64>,
    pixels: Option<Vec<u32>>
}

#[derive(Serialize, Deserialize, Debug)]
struct ChunkConfig {
    width: f64,
    height: f64,
    image: Rectangle,
    complex: Rectangle,
    buffers: Option<Buffers>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ChunkResult {
    buffers: Buffers,
    total: f64
}

#[derive(Serialize, Deserialize, Debug)]
struct NumberRange<T: Float> {
    min: T,
    max: T,
    size: T
}

impl <T: Float> NumberRange<T> {

    pub fn new(min: T, max: T) -> NumberRange<T> {
        NumberRange {
            min,
            max,
            size: (max - min).abs()
        }
    }
    
    pub fn scale(input: &NumberRange<T>, value: T, output: &NumberRange<T>) -> T {
        (input.max * output.min - input.min * output.max + value * output.size) / input.size
    }

}

struct Color {
    red: u8,
    green: u8,
    blue: u8,
    alpha: u8,
    abgr: u32
}

impl Color {

    pub fn black() -> &'static Color {
        static BLACK: Color = Color {red: 0, green: 0, blue: 0, alpha: 0xFF, abgr: 0};
        &BLACK
    }

    pub fn new(red: u8, green: u8, blue: u8, alpha: u8) -> Color {
        Color {
            red,
            green,
            blue,
            alpha,
            abgr: (((alpha as u32) << 24) ^ ((blue as u32) << 16) ^ ((green as u32) << 8) ^ red as u32).into()
        }
    }

    pub fn lerp(color1: &Color, color2: &Color, value: f64) -> Color {
        Color::new(
            color1.red + (color2.red - color1.red) * value as u8,
            color1.green + (color2.green - color1.green) * value as u8,
            color1.blue + (color2.blue - color1.blue) * value as u8,
            color1.alpha + (color2.alpha - color1.alpha) * value as u8
        )
    }

}

#[no_mangle]
pub unsafe extern "C" fn iterateChunk(raw_config: *const c_char, raw_chunk_config: *const c_char) -> u32 {
    let config_json = CStr::from_ptr(raw_config);
    let config: Config = serde_json::from_str(config_json.to_str().unwrap()).unwrap();

    /*let chunk_config_json = CStr::from_ptr(raw_chunk_config);
    let chunk_config: ChunkConfig = serde_json::from_str(chunk_config_json.to_str().unwrap()).unwrap();

    let image = chunk_config.image;
    let complex = chunk_config.complex;

    let width = image.width;
    let height = image.height;

    let ln2 = std::f64::consts::LN_2;
    let max_iterations = config.iterations;

    let mut histogram: Vec<u32> = vec![0; max_iterations as usize];
    let mut iterations: Vec<u32> = vec![0; (width * height) as usize];
    let mut fractionals: Vec<f64> = vec![0.0; (width * height) as usize];

    let width_range = NumberRange::new(image.start.x, image.end.x);
    let height_range = NumberRange::new(image.start.y, image.end.y);
    let real_range = NumberRange::new(complex.start.x, complex.end.x);
    let imaginary_range = NumberRange::new(complex.start.y, complex.end.y);

     let mut total = 0;
    let mut index = 0;
    for y in image.start.y as usize .. image.end.y as usize {
        for x in image.start.x as usize .. image.end.x as usize {
            let i0 = NumberRange::scale(&width_range, x as f64, &real_range);
            let j0 = NumberRange::scale(&height_range, y as f64, &imaginary_range);

            let jj0 = j0 * j0;
            let mut q = i0 - 0.25;
            q *= q;
            q += jj0;

            if q * (q + (i0 - 0.25)) < 0.25 * jj0 {
                iterations[index] = max_iterations as u32;
            } else {
                let mut iteration = 0;
                let mut ii = 0.0;
                let mut jj = 0.0;
                let mut i = 0.0;
                let mut j = 0.0;

                while ii + jj < f64::powi(2.0, 16) && iteration < max_iterations as usize {
                    let itemp = ii - jj + i0;
                    let jtemp = 2.0 * i * j + j0;
                    if i == itemp && j == jtemp {
                        iteration = max_iterations as usize;
                        break;
                    }
                    i = itemp;
                    j = jtemp;
                    ii = i * i;
                    jj = j * j;
                    iteration += 1;
                }
                iterations[index] = iteration as u32;
                if iteration < max_iterations as usize {
                    histogram[iteration] += 1;
                    total += 1;
                    fractionals[index] = (iteration as f64 + 1.0 - f64::ln(f64::ln(ii + jj) / 2.0 / ln2) / ln2) % 1.0;
                }
            }
        }
        index += 1;
    } */

    return 0;
}

#[no_mangle]
pub unsafe extern "C" fn colorChunk(raw_config: *const c_char, raw_chunk_config: *const c_char, buffers: Buffers, total: u32) {
    let config_json = CStr::from_ptr(raw_config);
    let config: Config = serde_json::from_str(config_json.to_str().unwrap()).unwrap();

    let chunk_config_json = CStr::from_ptr(raw_chunk_config);
    let chunk_config: ChunkConfig = serde_json::from_str(chunk_config_json.to_str().unwrap()).unwrap();

    /*let max_iterations = config.iterations;
    let red = config.red;
    let green = config.green;
    let blue = config.blue;

    let gradient = |n: f64| {
        Color::new(
            f64::floor(255.0 * n * red) as u8,
            f64::floor(255.0 * n * green) as u8,
            f64::floor(255.0 * n * blue) as u8,
            0xFF
        )
    };

    let image = chunk_config.image;
    let mut pixels = buffers.pixels.unwrap();

    let mut index = 0;
    for _y in image.start.y as usize .. image.end.y as usize {
        for _x in image.start.x as usize .. image.end.x as usize {
            let iteration = buffers.iterations[index];
            if iteration < max_iterations as u32 {
                let mut hue = 0.0;
                for i in 0 .. iteration as usize {
                    hue += buffers.histogram[i] as f64 / total as f64;
                }
                let color1 = gradient(hue);
                let color2 = gradient(hue + buffers.histogram[iteration as usize] as f64 / total as f64);
                pixels[index] = Color::lerp(&color1, &color2, buffers.fractionals[index]).abgr;
            } else {
                pixels[index] = Color::black().abgr;
            }
            index += 1;
        }
    }*/
}

#[test]
fn parse() {
    unsafe {
        let raw_config = CString::new(r#"{"iterations":1000,"red":10,"green":15,"blue":0.5,"rectangle":{"start":{"x":-2.5,"y":-1},"end":{"x":1,"y":1},"width":3.5,"height":2}}"#).unwrap().into_raw();
        let raw_chunk_config = CString::new(r#"{"width":1920,"height":1080,"image":{"start":{"x":0,"y":0},"end":{"x":256,"y":256},"width":256,"height":256},"complex":{"start":{"x":-2.5,"y":-1},"end":{"x":-2.033333333333333,"y":-0.5259259259259259},"width":0.4666666666666668,"height":0.4740740740740741}}"#).unwrap().into_raw();
        iterateChunk(raw_config, raw_chunk_config);
        CString::from_raw(raw_config);
        CString::from_raw(raw_chunk_config);
    }
}
