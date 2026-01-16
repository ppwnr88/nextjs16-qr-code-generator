## Feature Extension: QR Code with Center Icon

Extend the existing Next.js 16 QR Code Generator project.

### Requirements
- Add support for overlaying a custom icon/logo at the center of the QR code
- Icon must be optional
- Icon size must be configurable (default 20–25% of QR size)
- Preserve QR scannability:
  - Use error correction level "H"
  - Add white padding behind the icon

### Technical Constraints
- Implementation must run server-side
- Use Node-compatible image processing library (e.g. sharp)
- Do NOT rewrite existing QR generation logic
- Extend existing API route only

### API Changes
- Accept optional icon input:
  - URL
  - or base64 image

### Output
- Final QR code with centered icon as PNG
- Maintain backward compatibility (QR without icon still works)

Generate only the modified or new files.
Do not regenerate the entire project.
