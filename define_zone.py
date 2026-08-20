"""
Step 2a: Define a no-parking zone by clicking points on a frame from your video.
Saves the polygon to zone_config.json so the detection script can use it.

Usage:
    python define_zone.py --source your_clip.mp4

Controls:
    Left-click  : add a point to the polygon
    'z'         : undo last point
    's'         : save and quit
    'q'         : quit without saving
"""

import argparse
import json
import cv2

points = []


def click_event(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))
        print(f"Point added: ({x}, {y})")


def main(source: str, camera_id: str):
    cap = cv2.VideoCapture(source)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        print("Could not read a frame from the source.")
        return

    clone = frame.copy()
    cv2.namedWindow("Define No-Parking Zone")
    cv2.setMouseCallback("Define No-Parking Zone", click_event)

    print("Click points around the no-parking area. Press 's' to save, 'z' to undo, 'q' to quit.")

    while True:
        display = clone.copy()
        for i, pt in enumerate(points):
            cv2.circle(display, pt, 5, (0, 0, 255), -1)
            if i > 0:
                cv2.line(display, points[i - 1], pt, (0, 255, 0), 2)
        if len(points) > 2:
            cv2.line(display, points[-1], points[0], (0, 255, 0), 1)  # preview close

        cv2.imshow("Define No-Parking Zone", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("z") and points:
            points.pop()
        elif key == ord("s"):
            if len(points) < 3:
                print("Need at least 3 points to form a zone.")
                continue
            break
        elif key == ord("q"):
            cv2.destroyAllWindows()
            print("Quit without saving.")
            return

    cv2.destroyAllWindows()

    zone_data = {
        "camera_id": camera_id,
        "polygon": points,
        "threshold_seconds": 30,  # default dwell threshold, edit as needed
    }

    with open("zone_config.json", "w") as f:
        json.dump(zone_data, f, indent=2)

    print(f"Saved zone with {len(points)} points to zone_config.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to video file")
    parser.add_argument("--camera_id", default="cam_01", help="Identifier for this camera/source")
    args = parser.parse_args()
    main(args.source, args.camera_id)
