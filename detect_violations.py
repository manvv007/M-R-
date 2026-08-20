"""
Step 2b: Track vehicles, check dwell-time in the no-parking zone, and detect
wrong-side / wrong-way driving violations with evidence (timestamp, snapshot, track id).

Requires zone_config.json in the same folder (or default settings).

Usage:
    python detect_violations.py --source your_clip.mp4 [--direction up|down|left|right|any]

Output:
    - detected_violations.mp4  (annotated video with zone + dwell counters + wrong-way arrows)
    - candidates.json          (list of generated violation candidates)
    - snapshots/               (cropped evidence images per candidate)
"""

import argparse
import json
import math
import os
import time
from collections import defaultdict
import cv2
import numpy as np
from ultralytics import YOLO

VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def load_zone(path="zone_config.json"):
    if not os.path.exists(path):
        return "cam_01", None, 3, "down"
    with open(path) as f:
        data = json.load(f)
    polygon = np.array(data["polygon"], dtype=np.int32) if data.get("polygon") else None
    allowed_dir = data.get("allowed_direction", "down")
    return data.get("camera_id", "cam_01"), polygon, data.get("threshold_seconds", 3), allowed_dir


def get_bottom_center(box_xyxy):
    x1, y1, x2, y2 = box_xyxy
    return (int((x1 + x2) / 2), int(y2))  # bottom-center = where vehicle "touches" road


def get_center(box_xyxy):
    x1, y1, x2, y2 = box_xyxy
    return (int((x1 + x2) / 2), int((y1 + y2) / 2))


def is_wrong_direction(start_pt, end_pt, allowed_dir: str, min_displacement: float = 35.0):
    """
    Checks if vehicle movement from start_pt to end_pt opposes the allowed flow.
    allowed_dir can be: 'down' (vehicles should go downward +y), 'up' (vehicles go -y),
    'left' (vehicles go -x), 'right' (vehicles go +x), or 'none' / 'any' to skip.
    """
    if allowed_dir in ("none", "any", "all"):
        return False, 0.0

    dx = end_pt[0] - start_pt[0]
    dy = end_pt[1] - start_pt[1]
    dist = math.hypot(dx, dy)

    if dist < min_displacement:
        return False, dist

    # If allowed direction is 'down' (+y), going 'up' (-y) is wrong side
    if allowed_dir == "down" and dy < -min_displacement * 0.7:
        return True, dist
    # If allowed direction is 'up' (-y), going 'down' (+y) is wrong side
    elif allowed_dir == "up" and dy > min_displacement * 0.7:
        return True, dist
    # If allowed direction is 'right' (+x), going 'left' (-x) is wrong side
    elif allowed_dir == "right" and dx < -min_displacement * 0.7:
        return True, dist
    # If allowed direction is 'left' (-x), going 'right' (+x) is wrong side
    elif allowed_dir == "left" and dx > min_displacement * 0.7:
        return True, dist

    return False, dist


def main(source: str, conf: float = 0.35, allowed_direction: str = None):
    camera_id, zone_polygon, threshold_seconds, default_dir = load_zone()
    allowed_direction = allowed_direction or default_dir
    print(f"Loaded config for {camera_id}: dwell threshold={threshold_seconds}s, allowed direction='{allowed_direction}'")

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
    
    zone_scaled = (zone_polygon * scale).astype(np.int32) if zone_polygon is not None else None

    writer = cv2.VideoWriter(
        "detected_violations.mp4",
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (out_width, out_height),
    )

    zone_entry_time = {}   # track_id -> first frame timestamp seen inside zone
    track_history = defaultdict(list)  # track_id -> [(x, y, timestamp), ...]
    flagged_dwell_ids = set()
    flagged_wrong_way_ids = set()
    candidates = []

    frame_idx = 0
    print("Processing video with YOLOv8 tracker (Illegal Parking + Wrong Side Detection)...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        current_time = frame_idx / fps  # video-time seconds

        if scale != 1.0:
            frame = cv2.resize(frame, (out_width, out_height))

        # persist=True keeps track IDs stable across frames
        results = model.track(
            frame, conf=conf, classes=list(VEHICLE_CLASSES.keys()),
            persist=True, verbose=False,
        )

        annotated = frame.copy()
        if zone_scaled is not None:
            cv2.polylines(annotated, [zone_scaled], isClosed=True, color=(0, 0, 255), thickness=2)

        # Draw HUD for direction
        cv2.putText(
            annotated, f"Allowed Direction: {allowed_direction.upper()}",
            (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
        )

        boxes = results[0].boxes
        if boxes is not None and boxes.id is not None:
            for box, track_id in zip(boxes.xyxy.cpu().numpy(), boxes.id.cpu().numpy()):
                track_id = int(track_id)
                center_pt = get_center(box)
                bottom_pt = get_bottom_center(box)
                x1, y1, x2, y2 = map(int, box)

                # Maintain history (last 45 points)
                track_history[track_id].append((center_pt[0], center_pt[1], current_time))
                if len(track_history[track_id]) > 45:
                    track_history[track_id].pop(0)

                # Draw trajectory trail
                pts = track_history[track_id]
                for p_idx in range(1, len(pts)):
                    cv2.line(
                        annotated,
                        (pts[p_idx - 1][0], pts[p_idx - 1][1]),
                        (pts[p_idx][0], pts[p_idx][1]),
                        (255, 180, 0),
                        2
                    )

                # 1. CHECK WRONG-SIDE / WRONG-WAY DRIVING
                is_wrong_way = False
                if len(pts) >= 8:
                    start_pt = (pts[0][0], pts[0][1])
                    current_pt = (pts[-1][0], pts[-1][1])
                    wrong, displacement = is_wrong_direction(start_pt, current_pt, allowed_direction, min_displacement=30.0)
                    
                    if wrong:
                        is_wrong_way = True
                        if track_id not in flagged_wrong_way_ids:
                            flagged_wrong_way_ids.add(track_id)
                            snapshot_path = f"snapshots/candidate_wrongway_{track_id}_{frame_idx}.jpg"
                            cv2.imwrite(snapshot_path, frame[y1:y2, x1:x2] if y2 > y1 and x2 > x1 else frame)

                            candidates.append({
                                "candidate_id": f"cand_wrongway_{track_id}_{frame_idx}",
                                "track_id": track_id,
                                "camera_id": camera_id,
                                "timestamp_sec": round(current_time, 2),
                                "violation_type": "wrong_side_driving",
                                "displacement_px": round(displacement, 1),
                                "snapshot": snapshot_path,
                                "reason": "wrong_side_driving",
                                "review_status": "pending",
                            })
                            print(f"  [WRONG WAY] Candidate generated: track {track_id} at {current_time:.1f}s")

                # 2. CHECK DWELL-TIME IN NO-PARKING ZONE
                inside = False
                dwell = 0.0
                if zone_scaled is not None:
                    inside = cv2.pointPolygonTest(zone_scaled, bottom_pt, False) >= 0
                    if inside:
                        if track_id not in zone_entry_time:
                            zone_entry_time[track_id] = current_time
                        dwell = current_time - zone_entry_time[track_id]

                        if dwell >= threshold_seconds and track_id not in flagged_dwell_ids:
                            flagged_dwell_ids.add(track_id)
                            snapshot_path = f"snapshots/candidate_dwell_{track_id}_{frame_idx}.jpg"
                            cv2.imwrite(snapshot_path, frame[y1:y2, x1:x2] if y2 > y1 and x2 > x1 else frame)

                            candidates.append({
                                "candidate_id": f"cand_dwell_{track_id}_{frame_idx}",
                                "track_id": track_id,
                                "camera_id": camera_id,
                                "timestamp_sec": round(current_time, 2),
                                "violation_type": "illegal_parking_dwell",
                                "dwell_seconds": round(dwell, 2),
                                "snapshot": snapshot_path,
                                "reason": "dwell_time_exceeded",
                                "review_status": "pending",
                            })
                            print(f"  [DWELL TIME] Candidate generated: track {track_id} at {current_time:.1f}s (dwell {dwell:.1f}s)")
                    else:
                        zone_entry_time.pop(track_id, None)

                # Rendering BBox & Tag
                if is_wrong_way:
                    color = (0, 0, 255) # Red for wrong-way
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
                    cv2.putText(annotated, f"ID{track_id} WRONG WAY!", (x1, max(15, y1 - 8)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
                elif inside:
                    color = (0, 255, 255) if dwell < threshold_seconds else (0, 0, 255)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(annotated, f"ID{track_id} {dwell:.1f}s", (x1, max(15, y1 - 8)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                else:
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 1)
                    cv2.putText(annotated, f"ID{track_id}", (x1, max(15, y1 - 4)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)

        writer.write(annotated)
        if frame_idx % 60 == 0:
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
    parser.add_argument("--conf", type=float, default=0.35)
    parser.add_argument("--direction", choices=["up", "down", "left", "right", "any"], default=None,
                        help="Allowed flow direction (opposing direction flags wrong-side violation)")
    args = parser.parse_args()
    main(args.source, args.conf, args.direction)

