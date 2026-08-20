"""
Step 2b: Track vehicles, check dwell-time in the no-parking zone, and generate
violation candidates with evidence (timestamp, snapshot, track id).

Requires zone_config.json (created by define_zone.py) in the same folder.

Usage:
    python detect_violations.py --source your_clip.mp4

Output:
    - detected_violations.mp4  (annotated video with zone + dwell counters)
    - candidates.json          (list of generated violation candidates)
    - snapshots/               (cropped evidence images per candidate)
"""

import argparse
import json
import os
import time
import cv2
import numpy as np
from ultralytics import YOLO

VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def load_zone(path="zone_config.json"):
    with open(path) as f:
        data = json.load(f)
    polygon = np.array(data["polygon"], dtype=np.int32)
    return data["camera_id"], polygon, data["threshold_seconds"]


def get_bottom_center(box_xyxy):
    x1, y1, x2, y2 = box_xyxy
    return (int((x1 + x2) / 2), int(y2))  # bottom-center = where vehicle "touches" road


def main(source: str, conf: float = 0.4):
    camera_id, zone_polygon, threshold_seconds = load_zone()
    print(f"Loaded zone for {camera_id}, threshold={threshold_seconds}s")

    os.makedirs("snapshots", exist_ok=True)

    model = YOLO("yolov8n.pt")
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Could not open source: {source}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 1 or fps > 120:
        fps = 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    max_width = 960
    scale = min(1.0, max_width / width) if width > max_width else 1.0
    out_width, out_height = int(width * scale), int(height * scale)
    zone_scaled = (zone_polygon * scale).astype(np.int32)

    writer = cv2.VideoWriter(
        "detected_violations.mp4",
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (out_width, out_height),
    )

    zone_entry_time = {}   # track_id -> first frame timestamp seen inside zone
    flagged_ids = set()    # track_ids already turned into a candidate (avoid duplicates)
    candidates = []

    frame_idx = 0
    print("Processing... this uses tracking so it will be a bit slower than plain detection.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        current_time = frame_idx / fps  # video-time seconds, not wall-clock

        if scale != 1.0:
            frame = cv2.resize(frame, (out_width, out_height))

        # persist=True keeps track IDs stable across frames (ByteTrack under the hood)
        results = model.track(
            frame, conf=conf, classes=list(VEHICLE_CLASSES.keys()),
            persist=True, verbose=False,
        )

        annotated = frame.copy()
        cv2.polylines(annotated, [zone_scaled], isClosed=True, color=(0, 0, 255), thickness=2)

        boxes = results[0].boxes
        if boxes is not None and boxes.id is not None:
            for box, track_id in zip(boxes.xyxy.cpu().numpy(), boxes.id.cpu().numpy()):
                track_id = int(track_id)
                point = get_bottom_center(box)
                inside = cv2.pointPolygonTest(zone_scaled, point, False) >= 0

                x1, y1, x2, y2 = map(int, box)

                if inside:
                    if track_id not in zone_entry_time:
                        zone_entry_time[track_id] = current_time
                    dwell = current_time - zone_entry_time[track_id]

                    color = (0, 255, 255) if dwell < threshold_seconds else (0, 0, 255)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(annotated, f"ID{track_id} {dwell:.1f}s", (x1, y1 - 8),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                    if dwell >= threshold_seconds and track_id not in flagged_ids:
                        flagged_ids.add(track_id)
                        snapshot_path = f"snapshots/candidate_{track_id}_{frame_idx}.jpg"
                        cv2.imwrite(snapshot_path, frame[y1:y2, x1:x2] if y2 > y1 and x2 > x1 else frame)

                        candidates.append({
                            "candidate_id": f"cand_{track_id}_{frame_idx}",
                            "track_id": track_id,
                            "camera_id": camera_id,
                            "timestamp_sec": round(current_time, 2),
                            "dwell_seconds": round(dwell, 2),
                            "snapshot": snapshot_path,
                            "reason": "dwell_time_exceeded",
                            "review_status": "pending",
                        })
                        print(f"  Candidate generated: track {track_id} at {current_time:.1f}s "
                              f"(dwell {dwell:.1f}s)")
                else:
                    zone_entry_time.pop(track_id, None)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 1)

        writer.write(annotated)
        if frame_idx % 30 == 0:
            print(f"  processed {frame_idx} frames...")

    cap.release()
    writer.release()

    with open("candidates.json", "w") as f:
        json.dump(candidates, f, indent=2)

    print(f"\nDone. {len(candidates)} candidate(s) generated -> candidates.json")
    print("Annotated video saved to detected_violations.mp4")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to video file")
    parser.add_argument("--conf", type=float, default=0.4)
    args = parser.parse_args()
    main(args.source, args.conf)
