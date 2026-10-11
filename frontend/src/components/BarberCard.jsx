
export default function BarberCard({
  selectedStyle,
  topLength,
  sideLength,
  fadeHeight,
  texture,
  fringeDirection,
  generatedImage,
}) {
  const styleNames = {
    textured_crop: "Textured Crop",
    modern_quiff: "Modern Quiff",
    side_part: "Side Part",
  };

  const styleName = styleNames[selectedStyle] || selectedStyle;

  const instructions = `Keep approximately ${topLength.toFixed(1)} inches
  of hair on top, with a ${fadeHeight} fade and a #${sideLength}
  guard on the sides. Create a ${texture} texture with the
  fringe directed ${fringeDirection}. Use the reference
  image to match the overall shape and finish.`;

  return (
    <div
      id="barber-card"
      style={{
        maxWidth: "550px",
        margin: "30px auto",
        padding: "24px",
        border: "1px solid #ccc",
        borderRadius: "16px",
        background: "white",
        color: "#222",
      }}
    >
      <h2>✂️ BarberCopilot</h2>
      <h3>Your Barber Instruction Card</h3>
      <p>{styleName}</p>

      {generatedImage && (
        <img
          src={generatedImage}
          alt="Generated hairstyle reference"
          style={{
            width: "100%",
            borderRadius: "12px",
            marginBottom: "16px",
          }}
        />
      )}

      <h4>Haircut Specifications</h4>

      <p>Top Length: {topLength.toFixed(1)} inches</p>
      <p>Side Length: #{sideLength} guard</p>
      <p>Fade Height: {fadeHeight}</p>
      <p>Texture: {texture}</p>
      <p>Fringe Direction: {fringeDirection}</p>

      <h4>Instructions for Your Barber</h4>
      <p>{instructions}</p>

      <button
        className="no-print"
        onClick={() => window.print()}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
