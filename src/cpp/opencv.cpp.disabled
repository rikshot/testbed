#include <emscripten/emscripten.h>

#include "opencv2/opencv.hpp"

using namespace cv;

extern "C" {

    void EMSCRIPTEN_KEEPALIVE processFrame(unsigned const width, unsigned const height, unsigned char * const pixels) {
        Mat frame(height, width, CV_8UC4, pixels);
        Mat frame_gray;
        CascadeClassifier faceCascade("/cascade.xml");

        cvtColor(frame, frame_gray, COLOR_RGBA2GRAY);
        equalizeHist(frame_gray, frame_gray);

        std::vector<Rect> faces;
        faceCascade.detectMultiScale(frame_gray, faces, 1.1, 2, 0 | CASCADE_SCALE_IMAGE, Size(30, 30));

        for(auto face : faces) {
            Point center(face.x + face.width / 2, face.y + face.height / 2);
            ellipse(frame, center, Size(face.width / 2, face.height / 2), 0, 0, 360, Scalar(255, 255, 255, 255), 4);
        }
    }

}
