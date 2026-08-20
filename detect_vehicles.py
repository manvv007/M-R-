"""
Step 1: Basic YOLO vehicle detection on a video file.
Run this first to confirm detection works before adding zones/dwell-time.

Usage:
    python detect_vehicles.py --source your_clip.mp4

Requirements:
    pip install ultralytics opencv-python
"""

import argparse
import cv2
from ultralytics import YOLO

# COCO class IDs for vehicles
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def main(source: str, conf: float = 0.4, save_output: bool = True):
    # yolov8n = nano model, fastest on CPU. Auto-downloads on first run.
    model = YOLO("yolov8n.pt")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Could not open video source: {source}")
        return

    # Reported FPS on phone/VFR footage is often wrong, which causes the
    # saved output to play back slower or faster than the source. Fall back
    # to a sane default only if the metadata is clearly bogus.
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 1 or fps > 120:
        print(f"Warning: reported FPS looked wrong ({fps}), defaulting to 25.")
        print("For best results, re-encode the source to constant FPS with ffmpeg:")
        print("  ffmpeg -i raw_clip.mp4 -r 25 -c:v libx264 fixed_clip.mp4")
        fps = 25

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Downscale large frames for faster CPU inference (keeps aspect ratio).
    max_width = 960
    scale = min(1.0, max_width / width) if width > max_width else 1.0
    out_width, out_height = int(width * scale), int(height * scale)

    writer = None
    if save_output:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter("detected_output.mp4", fourcc, fps, (out_width, out_height))

    frame_count = 0
    print(f"Processing at {fps:.1f} FPS, {out_width}x{out_height}... (no live preview, faster this way)")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        if scale != 1.0:
            frame = cv2.resize(frame, (out_width, out_height))

        # Run detection on this frame, restricted to vehicle classes
        results = model.predict(
            frame,
            conf=conf,
            classes=list(VEHICLE_CLASSES.keys()),
            verbose=False,
        )

        annotated = results[0].plot()  # draws boxes + labels automatically

        if writer:
            writer.write(annotated)

        if frame_count % 30 == 0:
            print(f"  processed {frame_count} frames...")

    cap.release()
    if writer:
        writer.release()
    print(f"Done. Processed {frame_count} frames at {fps:.1f} FPS.")
    if save_output:
        print("Saved annotated video to detected_output.mp4")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to video file or 0 for webcam")
    parser.add_argument("--conf", type=float, default=0.4, help="Confidence threshold")
    args = parser.parse_args()
    main(args.source, args.conf)
