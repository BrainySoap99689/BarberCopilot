
import { useRef } from "react";

export default function BarberCard({
  selectedStyle,
  topLength,
  sideLength,
  fadeHeight,
  texture,
  fringeDirection,
  generatedImage,
  generatedViews = null,
}) {
  const styleNames = {
    textured_crop: "Textured Crop",
    modern_quiff: "Modern Quiff",
    side_part: "Side Part",
  };

  const cardRef = useRef(null);

function handlePrintCard() {
  if (!cardRef.current) return;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups to print your Barber Card.");
    return;
  }

  const cardHTML = cardRef.current.outerHTML;

  const printStyles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>BarberCopilot - Barber Card</title>
        <style>
          ${printStyles}

          @page {
            size: auto;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 12px;
            background: white;
            font-family: Arial, sans-serif;
          }

          #barber-card {
            display: block !important;
            position: static !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 750px !important;
            margin: 0 auto !important;
            padding: 16px !important;
            box-shadow: none !important;
            box-sizing: border-box;
          }

          #barber-card * {
            visibility: visible !important;
          }

          .no-print {
            display: none !important;
          }

          .barber-card-views {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .barber-card-view img {
            height: 125px !important;
            object-fit: contain !important;
          }

          .barber-card-specs {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          @media print {
            body * {
              visibility: visible !important;
            }

            #barber-card {
              position: static !important;
            }
          }
        </style>
      </head>
      <body>
        ${cardHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

  const styleName = styleNames[selectedStyle] || selectedStyle;

  const formatLabel = (value) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  const fringeLabels = {
    forward: "Forward",
    side: "Swept to the side",
    back: "Swept back",
  };

  const fringeLabel =
    fringeLabels[fringeDirection] || fringeDirection;

  const instructions =
    `Keep approximately ${topLength.toFixed(1)} inches ` +
    `of hair on top, with a ${fadeHeight} fade and a ` +
    `#${sideLength} guard on the sides. Create a ${texture} ` +
    `texture with the fringe ${fringeLabel.toLowerCase()}. ` +
    `Use the reference image to match the overall shape and finish.`;

  return (
    <section
      id="barber-card"
      className="barber-card"
      ref={cardRef}
    >
      <div className="barber-card-header">
        <div>
          <span className="barber-card-eyebrow">
            YOUR PERSONALIZED HAIRCUT
          </span>
          <h2>✂ BarberCopilot</h2>
          <p>Professional Barber Instruction Card</p>
        </div>
      </div>

      <div className="barber-card-style">
        <span>Selected hairstyle</span>
        <h3>{styleName}</h3>
      </div>

      
{generatedViews && Object.keys(generatedViews).length > 0 ? (
  <div className="barber-card-views">
    {["front", "side", "back"].map((view) =>
      generatedViews[view] ? (
        <div className="barber-card-view" key={view}>
          <img
            src={generatedViews[view]}
            alt={`${view} haircut reference`}
          />
          <span>
            {view.charAt(0).toUpperCase() + view.slice(1)} View
          </span>
        </div>
      ) : null
    )}
  </div>
) : generatedImage ? (
  <div className="barber-card-image">
    <img
      src={generatedImage}
      alt="Generated hairstyle reference"
    />
    <p>AI-generated haircut reference</p>
  </div>
) : null}


      <h4>Haircut Specifications</h4>

      <div className="barber-card-specs">
        <div>
          <span>Top length</span>
          <strong>{topLength.toFixed(1)} inches</strong>
        </div>

        <div>
          <span>Side length</span>
          <strong>#{sideLength} guard</strong>
        </div>

        <div>
          <span>Fade height</span>
          <strong>{formatLabel(fadeHeight)}</strong>
        </div>

        <div>
          <span>Texture</span>
          <strong>{formatLabel(texture)}</strong>
        </div>

        <div>
          <span>Fringe direction</span>
          <strong>{fringeLabel}</strong>
        </div>
      </div>

      <div className="barber-card-instructions">
        <h4>Instructions for Your Barber</h4>
        <p>{instructions}</p>
      </div>

      <button
        type="button"
        className="barber-card-print no-print"
        onClick={handlePrintCard}
      >
        Print / Save as PDF ↗
      </button>
    </section>
  );
}
