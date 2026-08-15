# Live Solder Inspection MVP

## 1. Summary

Live Solder Inspection reads live phone-camera video of the solder side of a circuit board and labels the visible condition of each solder joint it detects. A solder joint bonds a component lead to a pad on the board. A joint with too little solder, too much solder, a bridge to a neighboring pad, or a shifted lead can look acceptable to a new builder and still cause the finished board to misbehave.

The user scans the board slowly with a phone. The app returns:

- a bounding box around each detected joint
- a likely condition for each joint
- a confidence score and a severity rank
- live guidance to move closer, change the angle, or improve the lighting
- a short list of joints worth checking or reworking by hand

Each warning links to the video frame that supports it, and every verdict describes visual appearance. The user confirms electrical function with their own continuity testing.

## 2. The user

The primary user assembles small electronics at a home workbench: ESP32 and Arduino projects, sensor boards, and short production runs built from generated instructions. They solder header pins and small components by hand, and they have inspected too few joints to judge their own work by eye. Each finished board leaves them with one question: which joints need rework before power-on. A missed bridge shorts the board the moment power is applied, and a joint with too little solder passes early testing and returns later as an intermittent fault. Small repair and prototyping shops run the same workflow at higher volume.

## 3. MVP scope

The first version inspects one exposed side of a stationary, unpowered board through a phone camera fitted with an inexpensive macro lens or microscope attachment. Each visible joint receives a session-local identifier keyed to its position in the scan, shown to the user as Joint 12 and returned by the API as `joint_012`. Joint identity comes from position alone.

The app reports the six findings its training data represents:

- acceptable joint
- insufficient solder
- excessive solder
- solder bridge or short
- shifted or malformed joint
- unable to assess

## 4. Workflow

1. The user places the unpowered board on a stable surface.
2. The app asks the user to scan the solder side slowly. Example on-screen copy: "Please move the camera slowly across the solder side of the board."
3. Live capture checks focus, distance, glare, and coverage, and prompts a correction when one falls short. Example: "Please move closer to the board."
4. The video and session layer, NVIDIA Video Search and Summarization (VSS, described in section 5), selects useful frames and maintains the inspection session.
5. The inspection model detects and classifies the visible joints in the selected frames.
6. VSS combines repeated observations of the same joint into one finding.
7. The app overlays boxes on suspicious joints and sorts results by severity and confidence.
8. The user taps a result to see representative frames and basic rework guidance.
9. After rework, the user rescans the joint and the app shows the before-and-after comparison.

## 5. Technical architecture

The system splits across a phone application, a local inference server, and two model layers on that server.

### What the system reads

The camera captures live video of one exposed solder side of a stationary board. The phone uploads frames to the server; whether it sends the full stream or a sampled subset stays an open decision for implementation. The inspection model sees only the frames VSS selects, so the inspection covers the scanned side alone: joints on the far side of the board and joints hidden under components stay outside the result set.

### Phone application

The phone captures live video, guides the camera, uploads frames, displays overlays and results, and runs the before-and-after rescan flow. All model inference runs on the server.

### GN100 inference server

The GN100, a GPU machine on the local network, receives the uploaded frames, runs VSS and the trained solder-joint detector, tracks findings across frames, and returns structured inspection results. The same machine trains the model (section 7).

### Inspection model

A dedicated computer-vision model performs the joint detection and defect classification. It trains on annotated still images and classifies the video frames VSS selects, so one image-trained model serves the MVP.

### VSS

NVIDIA Video Search and Summarization supplies the video and session layer. It selects sharp frames, rejects blurred or highly reflective frames, maintains temporal context, associates repeated views with one inspection session, aggregates the model's observations, and answers session queries such as "show me the three most suspicious joints". VSS manages frames and sessions, and the fine-tuned inspection model supplies every defect prediction.

## 6. Initial training data

Candidate public datasets:

- **SolDef_AI**: microscope images of surface-mount joints labeled good, excessive, insufficient, and spiked.
- **Ülger solder-joint dataset**: cropped joint images covering normal, excessive, insufficient, shifted, and shorted classes.
- **PCBSPDefect**: through-hole, flat-flex, and related solder-defect images. Access runs through a request to the maintainers.
- **PCB-AoI and VisA**: anomaly-detection datasets from adjacent domains. Their images match post-solder maker-board inspection less closely than the three sets above.

The package-type decision drives dataset selection:

- If PCBSPDefect grants access under a suitable license, the MVP targets through-hole header joints, the joint type on ESP32 and Arduino headers.
- Otherwise the MVP targets the surface-mount joint types SolDef_AI covers.

A validation claim extends only to joint types present in the training data: a model trained on surface-mount joints counts as validated for surface-mount joints, and a claim about ESP32 header pins requires through-hole training data. Before public deployment, verify the commercial license of every dataset used.

## 7. Model training

1. Audit dataset labels, licenses, class definitions, and image quality.
2. Select one narrowly defined component and joint type.
3. Convert all annotations into one detection or segmentation format.
4. Split data by physical board or capture session, so no near-duplicate image appears in both training and test sets.
5. Train a baseline joint detector and defect classifier.
6. Measure performance separately for every defect class.
7. Test robustness against blur, glare, rotation, distance changes, and different phone cameras.
8. Convert the model to the GN100's inference runtime and deploy it.
9. Add multi-frame aggregation through VSS.
10. Validate on a small physical test board built with deliberately varied joints.

Training and inference both run on the local GN100. The model retains "unable to assess" as an outcome, so a joint with weak visual evidence receives that label.

## 8. API output

The server returns one record per inspected joint:

```json
{
  "joint_id": "joint_012",
  "bounding_box": [412, 188, 486, 267],
  "classification": "insufficient_solder",
  "confidence": 0.81,
  "severity": "review",
  "supporting_frames": ["frame_104", "frame_119"],
  "capture_quality": "acceptable"
}
```

## 9. MVP acceptance criteria

The MVP passes when it:

- detects most visible solder joints in a supported test configuration
- maintains stable joint identifiers during a slow scan
- highlights visible bridges and insufficient-solder joints from the supported classes
- withholds results while image quality fails the capture checks
- returns inspection results within a few seconds of scanning
- shows the frame that supports each warning
- compares a joint before and after rework
- words each warning as a visual finding and leaves electrical verification to the user

Validation reports precision and recall for each defect class and counts false warnings per board; a single overall accuracy figure would hide weak performance on rare classes.
