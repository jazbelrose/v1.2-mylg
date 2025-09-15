/**
 * Generates an SVG path for a superellipse (squircle) shape with configurable corner radius and smoothing.
 * Uses a mathematical approximation to create smooth, rounded corners that are more organic than standard border-radius.
 * 
 * @param width - Width of the shape in pixels
 * @param height - Height of the shape in pixels  
 * @param r - Corner radius in pixels (default: 20)
 * @param k - Smoothing factor between 0.0 (sharp) and 1.0 (very smooth) (default: 0.6)
 * @returns SVG path string for the squircle shape
 */
export function getSquirclePath(
  width: number,
  height: number,
  r: number = 20,
  k: number = 0.6
): string {
  // Clamp smoothing factor to valid range
  const smoothing = Math.max(0, Math.min(1, k));
  
  // Ensure radius doesn't exceed half the smallest dimension
  const maxRadius = Math.min(width, height) / 2;
  const radius = Math.min(r, maxRadius);
  
  // If radius is 0 or dimensions are too small, return a simple rectangle
  if (radius <= 0 || width <= 0 || height <= 0) {
    return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  }
  
  // Calculate control point distance based on smoothing factor
  // Higher smoothing = longer control points = smoother curves
  const controlDistance = radius * (0.5 + smoothing * 0.5);
  
  // Define corner positions
  const topLeft = { x: radius, y: 0 };
  const topRight = { x: width - radius, y: 0 };
  const bottomRight = { x: width - radius, y: height };
  const bottomLeft = { x: radius, y: height };
  
  // Build the path with cubic bezier curves for each corner
  const path = [
    // Start at top-left corner, after the radius
    `M ${topLeft.x} ${topLeft.y}`,
    
    // Top edge
    `L ${topRight.x} ${topRight.y}`,
    
    // Top-right corner (cubic bezier)
    `C ${topRight.x + controlDistance} ${topRight.y} ${width} ${radius - controlDistance} ${width} ${radius}`,
    
    // Right edge  
    `L ${width} ${height - radius}`,
    
    // Bottom-right corner (cubic bezier)
    `C ${width} ${height - radius + controlDistance} ${bottomRight.x + controlDistance} ${height} ${bottomRight.x} ${height}`,
    
    // Bottom edge
    `L ${bottomLeft.x} ${bottomLeft.y}`,
    
    // Bottom-left corner (cubic bezier)
    `C ${bottomLeft.x - controlDistance} ${height} 0 ${height - radius + controlDistance} 0 ${height - radius}`,
    
    // Left edge
    `L 0 ${radius}`,
    
    // Top-left corner (cubic bezier)
    `C 0 ${radius - controlDistance} ${topLeft.x - controlDistance} 0 ${topLeft.x} 0`,
    
    // Close path
    'Z'
  ];
  
  return path.join(' ');
}