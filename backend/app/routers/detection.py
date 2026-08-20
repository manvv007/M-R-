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

# COCO class IDs for vehicles
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Store active video sessions
_sessions: dict = {}


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
async def stream_detection(session_id: str, conf: float = 0.4):
    """Stream YOLO-annotated frames as MJPEG for real-time viewing in the browser."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found. Upload a video first.")

    video_path = session["path"]
    if not os.path.exists(video_path):
        raise HTTPException(404, "Video file not found")

    async def generate():
        # Lazy-load YOLO model (auto-downloads yolov8n.pt on first use)
        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")

        cap = cv2.VideoCapture(video_path)
        fps = session["fps"]
        frame_delay = 1.0 / fps if fps > 0 else 0.04  # target frame timing

        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            # Run YOLO detection (vehicles only)
            results = model.predict(
                frame,
                conf=conf,
                classes=list(VEHICLE_CLASSES.keys()),
                verbose=False,
            )
            annotated = results[0].plot()

            # Count detections by class
            det_counts = {}
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                cls_name = VEHICLE_CLASSES.get(cls_id, f"cls_{cls_id}")
                det_counts[cls_name] = det_counts.get(cls_name, 0) + 1

            # Draw frame counter and detection stats overlay
            total_det = sum(det_counts.values())
            overlay_text = f"Frame {frame_count}/{session['total_frames']} | Vehicles: {total_det}"
            cv2.putText(annotated, overlay_text, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            y_offset = 60
            for cls_name, count in sorted(det_counts.items()):
                cv2.putText(annotated, f"  {cls_name}: {count}", (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 255), 2)
                y_offset += 25

            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_bytes = buffer.tobytes()

            # Yield as MJPEG boundary
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" +
                frame_bytes +
                b"\r\n"
            )

            # Pace the stream to roughly match original video fps
            await asyncio.sleep(frame_delay * 0.3)  # faster than real-time but smooth

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
