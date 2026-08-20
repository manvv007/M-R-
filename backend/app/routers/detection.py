"""
Video Detection API — Upload a video and stream back YOLO-annotated frames as MJPEG.
"""

import os
import uuid
import cv2
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

router = APIRouter(prefix="/api/detection", tags=["Detection"])

UPLOAD_DIR = Path("uploads/detection")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# COCO class IDs for vehicles (car, motorcycle, bus, truck, bicycle)
VEHICLE_CLASSES = {1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Store active video sessions
_sessions: dict = {}

# ── Global model cache (loaded once, reused across all requests) ──────────────
_model = None

def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO("yolov8n.pt")
    return _model


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for YOLO detection. Returns a session_id to stream results."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".mp4", ".avi", ".mov", ".mkv", ".webm"}:
        raise HTTPException(400, f"Unsupported video format: {ext}")

    session_id = uuid.uuid4().hex[:12]
    save_path = UPLOAD_DIR / f"{session_id}{ext}"

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Probe video metadata
    cap = cv2.VideoCapture(str(save_path))
    if not cap.isOpened():
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, "Could not read uploaded video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()

    _sessions[session_id] = {
        "path": str(save_path),
        "fps": fps,
        "width": width,
        "height": height,
        "total_frames": total_frames,
        "duration": round(duration, 1),
        "filename": file.filename,
    }

    return JSONResponse({
        "session_id": session_id,
        "filename": file.filename,
        "width": width,
        "height": height,
        "fps": round(fps, 1),
        "total_frames": total_frames,
        "duration": round(duration, 1),
    })


@router.get("/stream/{session_id}")
async def stream_detection(session_id: str, conf: float = 0.22, direction: str = "down"):
    """Stream YOLO-annotated frames with wrong-way detection as MJPEG."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found. Upload a video first.")

    video_path = session["path"]
    if not os.path.exists(video_path):
        raise HTTPException(404, "Video file not found")

    async def generate():
        import math
        from collections import defaultdict

        model = get_model()
        cap = cv2.VideoCapture(video_path)

        src_fps = session["fps"]
        # Skip 1 frame on high-FPS video for smooth 15-20 FPS throughput
        FRAME_STEP = 2 if src_fps >= 40 else 1
        TARGET_WIDTH = 854
        JPEG_Q = 72

        track_history = defaultdict(list)
        wrong_way_tracks = set()
        compliant_tracks = set()
        frame_count = 0

        def evaluate_direction(start_p, end_p, allowed_d, box_h):
            """
            Perspective-aware wrong-way check:
            Uses box height to scale displacement threshold so distant (small)
            vehicles are evaluated quickly with only 3-5px of movement.
            """
            dx = end_p[0] - start_p[0]
            dy = end_p[1] - start_p[1]
            min_disp = max(3.0, min(14.0, box_h * 0.12))

            if allowed_d == "down":
                if dy < -min_disp * 0.45:
                    return True   # Moving up -> Wrong way
                if dy > min_disp * 0.45:
                    return False  # Moving down -> Compliant

            elif allowed_d == "up":
                if dy > min_disp * 0.45:
                    return True   # Moving down -> Wrong way
                if dy < -min_disp * 0.45:
                    return False  # Moving up -> Compliant

            elif allowed_d == "right":
                if dx < -min_disp * 0.45:
                    return True   # Moving left -> Wrong way
                if dx > min_disp * 0.45:
                    return False  # Moving right -> Compliant

            elif allowed_d == "left":
                if dx > min_disp * 0.45:
                    return True   # Moving right -> Wrong way
                if dx < -min_disp * 0.45:
                    return False  # Moving left -> Compliant

            return None  # Movement too small to determine yet

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            if FRAME_STEP > 1 and frame_count % FRAME_STEP != 0:
                continue

            # Resize frame to standard processing resolution
            h, w = frame.shape[:2]
            if w > TARGET_WIDTH:
                scale = TARGET_WIDTH / w
                frame = cv2.resize(frame, (TARGET_WIDTH, int(h * scale)), interpolation=cv2.INTER_LINEAR)

            # YOLO inference with ByteTrack
            results = model.track(
                frame,
                conf=conf,
                classes=list(VEHICLE_CLASSES.keys()),
                persist=True,
                verbose=False,
                imgsz=480,
            )

            annotated = frame.copy()
            boxes = results[0].boxes
            det_counts = {}
            wrong_way_count = 0

            if boxes is not None and boxes.id is not None:
                ids_np = boxes.id.cpu().numpy()
                xyxy_np = boxes.xyxy.cpu().numpy()
                cls_np = boxes.cls.cpu().numpy() if boxes.cls is not None else None

                for i, (box, track_id) in enumerate(zip(xyxy_np, ids_np)):
                    track_id = int(track_id)
                    cls_id = int(cls_np[i]) if cls_np is not None else 2
                    cls_name = VEHICLE_CLASSES.get(cls_id, "vehicle")
                    det_counts[cls_name] = det_counts.get(cls_name, 0) + 1

                    x1, y1, x2, y2 = map(int, box)
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    box_h = max(10, y2 - y1)

                    track_history[track_id].append((cx, cy))
                    if len(track_history[track_id]) > 30:
                        track_history[track_id].pop(0)

                    pts = track_history[track_id]

                    # Trajectory line
                    for p_idx in range(1, len(pts)):
                        cv2.line(annotated, pts[p_idx - 1], pts[p_idx], (255, 180, 0), 2)

                    # Immediate early direction evaluation
                    if track_id not in wrong_way_tracks and len(pts) >= 2:
                        dir_result = evaluate_direction(pts[0], pts[-1], direction, box_h)
                        if dir_result is True:
                            wrong_way_tracks.add(track_id)
                            compliant_tracks.discard(track_id)
                        elif dir_result is False:
                            compliant_tracks.add(track_id)

                    # Render boxes based on state
                    if track_id in wrong_way_tracks:
                        wrong_way_count += 1
                        # 🔴 RED BOX FOR WRONG WAY VIOLATOR
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 3)
                        badge_w = min(170, max(90, x2 - x1 + 10))
                        cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + badge_w, y1), (0, 0, 255), -1)
                        cv2.putText(
                            annotated,
                            f"WRONG WAY! #{track_id}",
                            (x1 + 4, max(15, y1 - 6)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.42,
                            (255, 255, 255),
                            2,
                        )
                    elif track_id in compliant_tracks:
                        # 🟢 GREEN BOX FOR CONFIRMED COMPLIANT
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(
                            annotated,
                            f"{cls_name} #{track_id}",
                            (x1, max(15, y1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.42,
                            (0, 255, 0),
                            1,
                        )
                    else:
                        # 🟡 AMBER BOX FOR INITIAL FRAMES (DIRECTION PENDING)
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 255), 2)
                        cv2.putText(
                            annotated,
                            f"{cls_name} #{track_id}",
                            (x1, max(15, y1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.40,
                            (0, 220, 255),
                            1,
                        )

            # Top HUD Overlays
            total_det = sum(det_counts.values())
            cv2.rectangle(annotated, (10, 10), (380, 72), (0, 0, 0), -1)
            cv2.rectangle(annotated, (10, 10), (380, 72), (50, 50, 50), 1)

            cv2.putText(
                annotated,
                f"Vehicles: {total_det} | Flow: {direction.upper()}",
                (18, 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2,
            )

            wrong_color = (0, 0, 255) if wrong_way_count > 0 else (0, 255, 0)
            cv2.putText(
                annotated,
                f"WRONG DIRECTION: {wrong_way_count} VIOLATIONS",
                (18, 58),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.50,
                wrong_color,
                2,
            )

            # Encode and yield frame
            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, JPEG_Q])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" +
                buf.tobytes() +
                b"\r\n"
            )
            await asyncio.sleep(0)

        cap.release()

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/sessions")
async def list_sessions():
    """List active detection sessions."""
    return [
        {"session_id": sid, **{k: v for k, v in info.items() if k != "path"}}
        for sid, info in _sessions.items()
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a detection session and its video file."""
    session = _sessions.pop(session_id, None)
    if session:
        Path(session["path"]).unlink(missing_ok=True)
    return {"deleted": session_id}

