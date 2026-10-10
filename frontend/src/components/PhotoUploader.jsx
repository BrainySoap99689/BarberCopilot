
import { useState } from "react";

function PhotoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError("");
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://localhost:8000/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <h1>BarberCopilot</h1>
      <p>Upload a photo to explore new hairstyles.</p>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {preview && (
        <div>
          <h3>Your Photo</h3>
          <img
            src={preview}
            alt="Uploaded preview"
            style={{ width: "300px", borderRadius: "10px" }}
          />
        </div>
      )}

      <br />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
      >
        {loading ? "Uploading..." : "Upload Photo"}
      </button>

      {result && (
        <div>
          <p style={{ color: "green" }}>{result.message}</p>
          <p>Width: {result.width}px</p>
          <p>Height: {result.height}px</p>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default PhotoUploader;
